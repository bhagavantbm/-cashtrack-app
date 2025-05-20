import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../utils/axiosConfig';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import 'jspdf-autotable'; // For table support (optional but recommended)
import 'jspdf-autotable'; // For table support (optional but recommended)
import autoTable from 'jspdf-autotable';
import '../styles/CustomerDetails.css'



const CustomerDetails = () => {
  const { customerId } = useParams();
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({
    type: 'received',
    amount: '',
    description: '',
    paymentMethod: 'cash',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`/transactions/${customerId}`);
      const normalizedTxs = res.data.transactions.map(tx => ({
        ...tx,
        date: tx.date || tx.createdAt,
      }));
      setCustomer(res.data.customer);
      setTransactions(normalizedTxs);
    } catch (err) {
      setError('Failed to load customer details');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await axios.post('/transactions/add', {
        customerId,
        type: form.type,
        amount: Number(form.amount),
        description: form.description.trim() || '',
        paymentMethod: form.paymentMethod,
      });
      setForm({ type: 'received', paymentMethod: 'cash', amount: '', description: '' });
      await fetchTransactions();
    } catch (err) {
      console.error('Add transaction error:', err);
      setError('Failed to add transaction');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate total amounts paid and received separately
  const getTotals = () => {
    let totalReceived = 0;
    let totalPaid = 0;
    transactions.forEach(tx => {
      if (tx.type === 'received') totalReceived += tx.amount;
      else if (tx.type === 'paid') totalPaid += tx.amount;
    });
    return { totalReceived, totalPaid };
  };

  // Balance message based on totals
  const getBalanceMessage = () => {
    const { totalReceived, totalPaid } = getTotals();
    if (totalPaid > totalReceived) {
      return {
        message: `You will receive ₹${(totalPaid - totalReceived).toFixed(2)}`,
        className: 'bg-green',
      };
    } else if (totalReceived > totalPaid) {
      return {
        message: `You need to pay ₹${(totalReceived - totalPaid).toFixed(2)}`,
        className: 'bg-red',
      };
    } else {
      return {
        message: 'All settled',
        className: 'bg-gray-500',
      };
    }
  };
const handleDownloadPDF = () => {
  const doc = new jsPDF();

  // --- HEADER ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  const pageWidth = doc.internal.pageSize.getWidth();
  const title = `${customer.name}'s Transactions`;
  doc.text(title, pageWidth / 2, 15, { align: 'center' });

  // Date generated (right aligned)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const generatedDate = new Date().toLocaleString();
  doc.text(`Generated on: ${generatedDate}`, pageWidth - 14, 20, { align: 'right' });

  // Horizontal line below header
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.5);
  doc.line(14, 23, pageWidth - 14, 23);

  // --- TRANSACTIONS TABLE ---
  const headers = [['Date', 'Type', 'Amount', 'Payment Method', 'Description']];
  const rows = transactions.map(tx => [
    new Date(tx.date).toLocaleDateString(),
    tx.type === 'received' ? 'Received' : 'Paid',
    tx.amount.toFixed(2),
    tx.paymentMethod.charAt(0).toUpperCase() + tx.paymentMethod.slice(1),
    tx.description || '-',
  ]);

  doc.autoTable({
    startY: 30,
    head: headers,
    body: rows,
    styles: {
      font: 'helvetica',
      fontSize: 11,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [22, 160, 133], // teal
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [240, 248, 255], // very light blue
    },
  });

  // --- SUMMARY BLOCK ---
  const totalReceived = transactions
    .filter(tx => tx.type === 'received')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalPaid = transactions
    .filter(tx => tx.type !== 'received')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const balance = totalReceived - totalPaid;

  const startY = doc.lastAutoTable.finalY + 15;
  const marginX = 14;
  const summaryWidth = pageWidth - 28;
  const summaryHeight = 40;

  // Draw rounded rectangle for summary background
  doc.setDrawColor(22, 160, 133);
  doc.setFillColor(229, 247, 242); // light teal
  doc.roundedRect(marginX, startY, summaryWidth, summaryHeight, 4, 4, 'F');

  // Set font for summary text
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');

  // Total Received (green)
  doc.setTextColor(0, 128, 0);
  doc.text(`Total Received: ${totalReceived.toFixed(2)}`, marginX + 10, startY + 14);

  // Total Paid (red)
  doc.setTextColor(255, 0, 0);
  doc.text(`Total Paid: ${totalPaid.toFixed(2)}`, marginX + 10, startY + 26);

  // Balance
  if (balance > 0) {
    doc.setTextColor(0, 0, 255); // blue
    doc.text(`You Will Receive: ${balance.toFixed(2)}`, marginX + 130, startY + 20);
  } else if (balance < 0) {
    doc.setTextColor(255, 0, 0); // red
    doc.text(`You Need to Pay: ${Math.abs(balance).toFixed(2)}`, marginX + 130, startY + 20);
  } else {
    doc.setTextColor(0, 128, 0); // green
    doc.text('All Settled', marginX + 130, startY + 20);
  }

  // --- FOOTER (page numbers) ---
  const pageCount = doc.internal.getNumberOfPages();
  doc.setFontSize(9);
  doc.setTextColor(100);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  // --- SAVE FILE ---
  doc.save(`${customer.name}_transactions.pdf`);
};


  


 const handleShare = () => {
  if (!customer) return;

  const { totalReceived, totalPaid } = getTotals();
  const balance = (totalPaid - totalReceived).toFixed(2);
  let balanceText = '';

  if (totalPaid > totalReceived) {
    // You will receive money
    balanceText = `You need to pay ₹${balance}. Can you make the payment as soon as possible?`;
  } else if (totalPaid < totalReceived) {
    // You need to pay money
    balanceText = `I'll pay ₹${Math.abs(balance)} as soon as possible.`;
  } else {
    balanceText = 'Your balance is settled.';
  }

  let message = `Hello ${customer.name},\n\n${balanceText}\n\n🧾 Transaction Summary:\n`;
  transactions.forEach((tx) => {
    const date = new Date(tx.date).toLocaleDateString();
    const typeLabel = tx.type === 'received' ? 'Received Money' : 'Paid Money';
    const method = tx.paymentMethod.charAt(0).toUpperCase() + tx.paymentMethod.slice(1);
    const description = tx.description ? ` - ${tx.description}` : '';
    message += `• ${date} - ₹${tx.amount} [${typeLabel}] via ${method}${description}\n`;
  });

  const encodedMsg = encodeURIComponent(message);
  window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
};

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  if (loading) return <p className="text-center mt-10 text-lg">Loading customer details...</p>;
  if (error) return <p className="text-center mt-10 text-lg text-red-600">{error}</p>;
  if (!customer) return <p className="text-center mt-10 text-lg">Customer not found.</p>;

  const { message, className } = getBalanceMessage();

  return (
    <motion.div className="customer-details" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
 




      {/* Header */}
      <div className="customer-header">
        <h2>{customer.name}</h2>
        <p>{customer.phone}</p>
        <div className={`balance-box ${className}`}>
          {message}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleAddTransaction} className="form-box">
        <h3>Add Transaction</h3>

        <label htmlFor="type">Transaction Type</label>
        <select
          id="type"
          name="type"
          value={form.type}
          onChange={handleInputChange}
        >
          <option value="received">Received Money</option>
          <option value="paid">Paid Money</option>
        </select>

        <label htmlFor="paymentMethod">Payment Method</label>
        <select
          id="paymentMethod"
          name="paymentMethod"
          value={form.paymentMethod}
          onChange={handleInputChange}
          required
        >
          <option value="cash">Cash</option>
          <option value="online">Online</option>
        </select>

        <input
          id="amount"
          name="amount"
          type="number"
          placeholder="Amount"
          value={form.amount}
          onChange={handleInputChange}
          required
          min="0.01"
          step="0.01"
        />

        <input
          id="description"
          name="description"
          type="text"
          placeholder="Description (optional)"
          value={form.description}
          onChange={handleInputChange}
        />

        <button
          type="submit"
          disabled={submitting}
          className={submitting ? 'disabled' : 'active'}
        >
          {submitting ? 'Adding...' : 'Add Transaction'}
        </button>
      </form>

      {/* Transactions */}
      <div className="transaction-list">
        <h3>Transaction History</h3>
        {transactions.length === 0 ? (
          <p className="text-gray-500">No transactions yet.</p>
        ) : (
          transactions.map((tx) => (
            <div
              key={tx._id}
              className={`transaction-card ${tx.type === 'received' ? 'received' : 'paid'}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong>₹{tx.amount.toFixed(2)}</strong> — {tx.type === 'received' ? 'Received' : 'Paid'}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#4B5563' }}>
                  {new Date(tx.date).toLocaleString()}
                </div>
              </div>
              <div style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}>
                <strong>Method:</strong>{' '}
                {tx.paymentMethod.charAt(0).toUpperCase() + tx.paymentMethod.slice(1)}
              </div>
              {tx.description && (
                <div style={{ marginTop: '0.25rem', fontStyle: 'italic', color: '#374151' }}>
                  "{tx.description}"
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <button onClick={handleShare} className="whatsapp-btn">
        Share on WhatsApp
      </button>
      <button onClick={handleDownloadPDF} className="whatsapp-btn" style={{ backgroundColor: '#4B5563', marginTop: '1rem' }}>
  Download History as PDF
</button>

    </motion.div>
  );
};

export default CustomerDetails;
