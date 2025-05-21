import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUserCircle } from 'react-icons/fa';
import '../styles/Dashboard.css';
import api from '../utils/axiosConfig'; // BaseURL + Token setup

const Dashboard = () => {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [darkMode, setDarkMode] = useState(() => JSON.parse(localStorage.getItem('darkMode') ?? 'true'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const userName = localStorage.getItem('name') || localStorage.getItem('email') || 'User';

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
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

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return setError('Name and phone are required');

    setError('');
    try {
      await api.post('/customers', form);
      setForm({ name: '', phone: '' });
      fetchCustomers();
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate('/login');
      } else {
        setError(err.response?.data?.error || 'Failed to add customer');
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer?')) return;
    try {
      await api.delete(`/customers/${id}`);
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
      {/* Header */}
      <header className="dashboard-header">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search customers"
          />
        </div>

        <div
          className="profile"
          onClick={() => setShowDropdown((prev) => !prev)}
          style={{ cursor: 'pointer' }}
          aria-haspopup="true"
          aria-expanded={showDropdown}
          ref={dropdownRef}
        >
          <FaUserCircle size={28} color={darkMode ? 'white' : 'black'} />
          {showDropdown && (
            <div className="dropdown" role="menu">
              <button onClick={() => setDarkMode(!darkMode)}>
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </button>
              <button onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
      </header>

      {/* Summary */}
      <div className="summary-bar">
        <span>Total Received: ₹{totalReceived.toFixed(2)}</span>
        <span>Total Paid: ₹{totalPaid.toFixed(2)}</span>
        <span className={balance > 0 ? 'receive' : balance < 0 ? 'pay' : 'settled'}>
          {balance > 0 ? 'You will receive' : balance < 0 ? 'You need to pay' : 'All Settled'} ₹
          {Math.abs(balance).toFixed(2)}
        </span>
      </div>

      {/* Add Customer */}
      <form onSubmit={handleAddCustomer} className="add-customer-form">
        <input
          type="text"
          placeholder="Customer Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          type="tel"
          placeholder="10-digit Phone"
          pattern="[0-9]{10}"
          maxLength={10}
          value={form.phone}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '');
            if (val.length <= 10) setForm({ ...form, phone: val });
          }}
          required
        />
        <button type="submit">Add</button>
      </form>

      {/* Error or Loading */}
      {error && <div className="error-message">{error}</div>}
      {loading && <div className="loading-message">Loading customers...</div>}

      {/* Customer List */}
      <section className="customer-grid">
        {filteredCustomers.length === 0 && !loading && <p>No customers found.</p>}
        {filteredCustomers.map((cust) => {
          const { _id, name, phone, received = 0, paid = 0 } = cust;
          const bal = received - paid;
          const initials = name.split(' ').map((n) => n[0]?.toUpperCase() || '').join('');

          return (
            <motion.div
              key={_id}
              className="customer-card"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/customer/${_id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/customer/${_id}`)}
              aria-label={`View ${name}`}
            >
              <div className="avatar">{initials}</div>
              <div className="card-details">
                <h2>{name}</h2>
                <p>📞 {phone}</p>
                <p>Received: ₹{received.toFixed(2)}</p>
                <p>Paid: ₹{paid.toFixed(2)}</p>
                <p className={bal > 0 ? 'receive' : bal < 0 ? 'pay' : 'settled'}>
                  {bal > 0 ? 'You will receive' : bal < 0 ? 'You need to pay' : 'All Settled'} ₹
                  {Math.abs(bal).toFixed(2)}
                </p>
              </div>
              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(_id);
                }}
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
