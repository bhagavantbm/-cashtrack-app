import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from '../utils/axiosConfig';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUserCircle } from 'react-icons/fa';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === null ? true : JSON.parse(saved);
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const userName = localStorage.getItem('name') || localStorage.getItem('email') || 'User';

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/customers', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setCustomers(res.data);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.clear();
        navigate('/login');
      } else {
        setError('Failed to fetch customers');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Close dropdown if clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;

    setError('');
    try {
      await axios.post('/customers/add', form, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setForm({ name: '', phone: '' });
      fetchCustomers();
    } catch (error) {
      setError('Failed to add customer');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer?')) return;
    setError('');
    try {
      await axios.delete(`/customers/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setCustomers((prev) => prev.filter((c) => c._id !== id));
    } catch {
      setError('Failed to delete customer');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const totalReceived = customers.reduce((acc, c) => acc + (c.received || 0), 0);
  const totalPaid = customers.reduce((acc, c) => acc + (c.paid || 0), 0);
  const balance = totalReceived - totalPaid;

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dashboard-wrapper">
      <header className="dashboard-header">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search customers"
          />
          {/* Optional: remove this button if no functionality */}
          <button type="button" aria-label="Search customers">
            🔍
          </button>
        </div>

        <div
          className="profile"
          onClick={() => setShowDropdown(!showDropdown)}
          style={{ cursor: 'pointer' }}
          aria-haspopup="true"
          aria-expanded={showDropdown}
          ref={dropdownRef}
        >
          <FaUserCircle size={28} color={darkMode ? 'white' : 'black'} aria-hidden="true" />
          {showDropdown && (
            <div className="dropdown" role="menu" aria-label="Profile options">
              <button onClick={() => setDarkMode(!darkMode)} aria-label="Toggle dark/light mode">
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </button>
              <button onClick={handleLogout} aria-label="Logout">
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="summary-bar" aria-live="polite">
        <span>Total Received: ₹{totalReceived.toFixed(2)}</span>
        <span>Total Paid: ₹{totalPaid.toFixed(2)}</span>
        <span className={balance > 0 ? 'receive' : balance < 0 ? 'pay' : 'settled'}>
          {balance > 0
            ? 'You will receive'
            : balance < 0
            ? 'You need to pay'
            : 'All Settled'}{' '}
          ₹{Math.abs(balance).toFixed(2)}
        </span>
      </div>

      <form onSubmit={handleAddCustomer} className="add-customer-form" aria-label="Add new customer form">
        <input
          type="text"
          placeholder="Customer Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          aria-required="true"
        />
        <input
          type="tel"
          pattern="[0-9]{10}"
          placeholder="10-digit Phone Number"
          value={form.phone}
          maxLength={10}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '');
            if (val.length <= 10) setForm({ ...form, phone: val });
          }}
          required
          aria-required="true"
        />

        <button type="submit" aria-label="Add customer">
          Add
        </button>
      </form>

      {error && <div className="error-message" role="alert">{error}</div>}
      {loading && <div className="loading-message">Loading customers...</div>}

      <section
        className="customer-grid"
        aria-label="Customer list"
      >
        {filteredCustomers.length === 0 && !loading && <p>No customers found.</p>}
        {filteredCustomers.map((cust) => {
          const { received = 0, paid = 0 } = cust;
          const bal = received - paid;
          const initials = cust.name
            .split(' ')
            .map((n) => n[0].toUpperCase())
            .join('');

          return (
            <motion.div
              key={cust._id}
              className="customer-card"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/customer/${cust._id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/customer/${cust._id}`);
              }}
              aria-label={`View details for ${cust.name}`}
            >
              <div className="avatar" aria-hidden="true">{initials}</div>
              <div className="card-details">
                <h2>{cust.name}</h2>
                <p>📞 {cust.phone}</p>
                <p>Received: ₹{received.toFixed(2)}</p>
                <p>Paid: ₹{paid.toFixed(2)}</p>
                <p className={bal > 0 ? 'receive' : bal < 0 ? 'pay' : 'settled'}>
                  {bal > 0
                    ? 'You will receive'
                    : bal < 0
                    ? 'You need to pay'
                    : 'All Settled'}{' '}
                  ₹{Math.abs(bal).toFixed(2)}
                </p>
              </div>
              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(cust._id);
                }}
                aria-label={`Delete customer ${cust.name}`}
              >
                Delete
              </button>
            </motion.div>
          );
        })}
      </section>
    </div>
  );
};

export default Dashboard;
