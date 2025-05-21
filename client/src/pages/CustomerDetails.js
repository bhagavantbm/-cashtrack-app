import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../utils/axiosConfig';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import 'jspdf-autotable'; // For table support (optional but recommended)
import 'jspdf-autotable'; // For table support (optional but recommended)
import autoTable from 'jspdf-autotable';
import '../styles/CustomerDetails.css'
import { PDFDocument } from 'pdf-lib';



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
  async function pdfToImage(pdfBlob) {
  // Use pdfjs-dist to load PDF
  const pdfjsLib = await import('pdfjs-dist/build/pdf');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.9.179/pdf.worker.min.js';

  const loadingTask = pdfjsLib.getDocument({ data: await pdfBlob.arrayBuffer() });
  const pdf = await loadingTask.promise;

  const page = await pdf.getPage(pdf.numPages); // get last page
  const viewport = page.getViewport({ scale: 2 });

  // Create canvas
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  // Render page
  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };
  await page.render(renderContext).promise;

  return canvas.toDataURL('image/png');
}

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
        amount: parseFloat(Number(form.amount).toFixed(2)),
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
  const generateSummaryImage = () => {
  if (!customer || transactions.length === 0) return null;

  // Create a canvas element
  const canvas = document.createElement('canvas');
  const width = 600;
  const lineHeight = 25;
  const padding = 20;
  const headerHeight = 60;
  const rowCount = transactions.length + 2; // 1 header + transactions + balance row
  const height = headerHeight + rowCount * lineHeight + padding * 2;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = '#16a085'; // teal
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${customer.name}'s Transaction Summary`, width / 2, padding + 25);

  ctx.font = '16px Arial';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';

  // Header Row
  const startY = padding + 50;
  ctx.fillText('Date', 20, startY);
  ctx.fillText('Type', 150, startY);
  ctx.fillText('Amount (₹)', 300, startY);
  ctx.fillText('Payment Method', 420, startY);
  ctx.fillText('Description', 530, startY);

  ctx.strokeStyle = '#16a085';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(15, startY + 5);
  ctx.lineTo(width - 15, startY + 5);
  ctx.stroke();

  // Transactions rows
  let y = startY + lineHeight;
  transactions.forEach(tx => {
    ctx.fillText(new Date(tx.date).toLocaleDateString(), 20, y);
    ctx.fillText(tx.type === 'received' ? 'Received' : 'Paid', 150, y);
    ctx.fillText(tx.amount.toFixed(2), 300, y);
    ctx.fillText(tx.paymentMethod.charAt(0).toUpperCase() + tx.paymentMethod.slice(1), 420, y);
    ctx.fillText(tx.description || '-', 530, y);
    y += lineHeight;
  });

  // Balance row
  const { totalReceived, totalPaid } = getTotals();
  const balance = totalPaid - totalReceived;
  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = balance > 0 ? 'green' : balance < 0 ? 'red' : 'gray';
  const balanceText =
    balance > 0
      ? `You will receive ₹${balance.toFixed(2)}`
      : balance < 0
      ? `You need to pay ₹${Math.abs(balance).toFixed(2)}`
      : 'All settled';
  ctx.fillText(balanceText, 20, y + 2 * lineHeight);

  return canvas.toDataURL('image/png');
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
