import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import QRCode from 'qrcode';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

function App() {
    const [token, setToken] = useState(sessionStorage.getItem('token'));
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
    const [todos, setTodos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newTodo, setNewTodo] = useState({ title: '', description: '', dueDate: '', priority: 'Medium' });
    const [paymentError, setPaymentError] = useState('');
    const [subscriptionStatus, setSubscriptionStatus] = useState(user?.subscriptionStatus || 'free');

    // Auth state
    const [isLogin, setIsLogin] = useState(true);
    const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [mfaRequired, setMfaRequired] = useState(false);
    const [mfaTempToken, setMfaTempToken] = useState('');
    const [mfaCode, setMfaCode] = useState('');
    const [mfaSetup, setMfaSetup] = useState(null);
    const [mfaQrUrl, setMfaQrUrl] = useState('');
    const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [resetTokenSent, setResetTokenSent] = useState(false);
    const [newPasswordReset, setNewPasswordReset] = useState('');
    const [resetMessage, setResetMessage] = useState('');

    // Fetch todos when logged in
    useEffect(() => {
        if (token) {
            fetchTodos();
        }
    }, [token]);

    useEffect(() => {
        if (mfaSetup?.otpauthUrl) {
            QRCode.toDataURL(mfaSetup.otpauthUrl)
                .then(setMfaQrUrl)
                .catch((err) => {
                    console.error('Failed to generate MFA QR code', err);
                    setMfaQrUrl('');
                });
        } else {
            setMfaQrUrl('');
        }
    }, [mfaSetup]);

    const fetchTodos = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/todos`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTodos(data);
            }
        } catch (err) {
            console.error('Failed to fetch todos');
        }
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (mfaRequired) {
            await handleMfaSubmit();
        } else {
            await handleAuth();
        }
    };

    const handleAuth = async () => {
        setAuthError('');
        setAuthLoading(true);

        try {
            const endpoint = isLogin ? '/auth/login' : '/auth/register';
            const body = isLogin
                ? { email: authForm.email, password: authForm.password }
                : authForm;

            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (res.ok) {
                if (data.mfaRequired) {
                    setForgotPasswordMode(false);
                    setResetTokenSent(false);
                    setResetMessage('');
                    setMfaRequired(true);
                    setMfaTempToken(data.tempToken);
                    setMfaSetup(data.mfaSetup || null);
                    setAuthError('Enter the code from your authenticator app to complete login.');
                } else {
                    sessionStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    setToken(data.token);
                    setUser(data.user);
                    setSubscriptionStatus(data.user.subscriptionStatus || 'free');
                    setAuthForm({ username: '', email: '', password: '' });
                    setMfaRequired(false);
                    setMfaTempToken('');
                    setMfaCode('');
                    setMfaSetup(data.mfaSetup || null);
                }
            } else {
                setAuthError(data.error || 'Authentication failed');
            }
        } catch (err) {
            setAuthError(err?.message || 'Network error. Please try again.');
        }
        setAuthLoading(false);
    };

    const handleMfaSubmit = async () => {
        if (!mfaTempToken || !mfaCode.trim()) {
            setAuthError('Please enter your MFA code.');
            return;
        }

        setAuthLoading(true);
        setAuthError('');

        try {
            const res = await fetch(`${API_URL}/auth/mfa/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: mfaTempToken, code: mfaCode.trim() })
            });

            const data = await res.json();
            if (res.ok) {
                sessionStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                setToken(data.token);
                setUser(data.user);
                setSubscriptionStatus(data.user.subscriptionStatus || 'free');
                setAuthForm({ username: '', email: '', password: '' });
                setMfaRequired(false);
                setMfaTempToken('');
                setMfaCode('');
                setMfaSetup(null);
            } else {
                setAuthError(data.error || 'MFA verification failed');
            }
        } catch (err) {
            setAuthError(err?.message || 'Network error. Please try again.');
        }

        setAuthLoading(false);
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        setAuthLoading(true);
        setAuthError('');
        setMfaRequired(false);
        setMfaTempToken('');
        setMfaCode('');
        setMfaSetup(null);
        try {
            const res = await fetch(`${API_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: credentialResponse.credential })
            });
            const data = await res.json();
            if (res.ok) {
                if (data.mfaRequired) {
                    setForgotPasswordMode(false);
                    setResetTokenSent(false);
                    setResetMessage('');
                    setMfaRequired(true);
                    setMfaTempToken(data.tempToken);
                    setMfaSetup(data.mfaSetup || null);
                    setAuthError('Enter the code from your authenticator app to complete login.');
                } else {
                    sessionStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    setToken(data.token);
                    setUser(data.user);
                    setSubscriptionStatus(data.user.subscriptionStatus || 'free');
                    setMfaSetup(null);
                }
            } else {
                setAuthError(data.error || 'Google authentication failed');
            }
        } catch (err) {
            setAuthError(err?.message || 'Network error with Google sign-in.');
        }
        setAuthLoading(false);
    };

    const loadRazorpayScript = () => {
        return new Promise((resolve, reject) => {
            if (window.Razorpay) return resolve(true);
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => reject(new Error('Razorpay SDK failed to load'));
            document.body.appendChild(script);
        });
    };

    const handleSubscribe = async () => {
        setPaymentError('');
        try {
            const loaded = await loadRazorpayScript();
            if (!loaded) {
                setPaymentError('Unable to load payment gateway. Please try again later.');
                return;
            }

            const orderRes = await fetch(`${API_URL}/payments/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
            });
            const orderText = await orderRes.text();
            let orderData;
            try {
                orderData = JSON.parse(orderText);
            } catch (parseError) {
                orderData = { error: orderText || 'Unable to parse payment order response' };
            }
            if (!orderRes.ok) {
                console.error('Create order failed', orderRes.status, orderData);
                setPaymentError(orderData.error || `Unable to create payment order (${orderRes.status})`);
                return;
            }

            const options = {
                key: orderData.keyId,
                amount: orderData.order.amount,
                currency: orderData.order.currency,
                name: 'Todo App Subscription',
                description: 'Premium subscription payment',
                order_id: orderData.order.id,
                handler: async function (response) {
                    try {
                        const verifyRes = await fetch(`${API_URL}/payments/verify-payment`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify(response)
                        });
                        const verifyData = await verifyRes.json();
                        if (verifyRes.ok) {
                            setSubscriptionStatus('active');
                            const updatedUser = { ...user, subscriptionStatus: 'active' };
                            setUser(updatedUser);
                            localStorage.setItem('user', JSON.stringify(updatedUser));
                        } else {
                            setPaymentError(verifyData.error || 'Payment verification failed.');
                        }
                    } catch (err) {
                        setPaymentError('Payment verification network error.');
                    }
                },
                prefill: {
                    email: user?.email,
                    name: user?.username,
                },
                theme: { color: '#525cf5' },
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.open();
        } catch (err) {
            console.error('Subscribe error:', err);
            setPaymentError(err.message || 'Subscription failed.');
        }
    };

    const handleForgotPasswordRequest = async (e) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError('');
        setResetMessage('');

        try {
            const res = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail })
            });
            const data = await res.json();
            if (res.ok) {
                setResetToken(data.resetToken || '');
                setResetTokenSent(true);
                setResetMessage('Reset token generated. Use it below to create a new password.');
            } else {
                setAuthError(data.error || 'Unable to send reset token.');
            }
        } catch (err) {
            setAuthError(err?.message || 'Network error.');
        }

        setAuthLoading(false);
    };

    const handleResetPasswordSubmit = async (e) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError('');
        setResetMessage('');

        try {
            const res = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail, token: resetToken, newPassword: newPasswordReset })
            });
            const data = await res.json();
            if (res.ok) {
                setResetMessage(data.message || 'Password reset successful. Please log in.');
                setForgotPasswordMode(false);
                setResetTokenSent(false);
                setForgotEmail('');
                setResetToken('');
                setNewPasswordReset('');
            } else {
                setAuthError(data.error || 'Unable to reset password.');
            }
        } catch (err) {
            setAuthError(err?.message || 'Network error.');
        }

        setAuthLoading(false);
    };

    const handleLogout = () => {
        sessionStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        setTodos([]);
        setSubscriptionStatus('free');
        setMfaRequired(false);
        setMfaTempToken('');
        setMfaCode('');
        setMfaSetup(null);
        setMfaQrUrl('');
        setAuthForm({ username: '', email: '', password: '' });
        setNewTodo({ title: '', description: '', dueDate: '', priority: 'Medium' });
    };

    const addTodo = async (e) => {
        e.preventDefault();
        if (!newTodo.title.trim()) return;

        try {
            const res = await fetch(`${API_URL}/todos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: newTodo.title,
                    description: newTodo.description,
                    due_date: newTodo.dueDate,
                    priority: newTodo.priority,
                })
            });

            if (res.ok) {
                const todo = await res.json();
                setTodos([todo, ...todos]);
                setNewTodo({ title: '', description: '', dueDate: '', priority: 'Medium' });
            }
        } catch (err) {
            console.error('Failed to add todo', err);
        }
    };

    const toggleTodo = async (id) => {
        try {
            const res = await fetch(`${API_URL}/todos/${id}/toggle`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const updated = await res.json();
                setTodos(todos.map(t => t.id === id ? updated : t));
            }
        } catch (err) {
            console.error('Failed to toggle todo');
        }
    };

    const deleteTodo = async (id) => {
        try {
            const res = await fetch(`${API_URL}/todos/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                setTodos(todos.filter(t => t.id !== id));
            }
        } catch (err) {
            console.error('Failed to delete todo');
        }
    };

    // Auth Screen
    if (!token) {
        return (
            <div className="auth-container">
                <div className="auth-box">
                    <h1 className="auth-title">
                        <span>Todo</span> App
                    </h1>
                    <h2 className="auth-subtitle">{isLogin ? 'Sign In' : 'Create Account'}</h2>
                    {authError && <div className="error-message">{authError}</div>}
                    {resetMessage && <div className="success-message">{resetMessage}</div>}
                    {!forgotPasswordMode ? (
                        <form onSubmit={handleSubmit}>
                            {!isLogin && (
                                <div className="form-group">
                                    <label>Username</label>
                                    <input
                                        type="text"
                                        value={authForm.username}
                                        onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                                        placeholder="Enter username"
                                        required={!isLogin}
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={authForm.email}
                                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                                    placeholder="Enter email"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    value={authForm.password}
                                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                                    placeholder="Enter password"
                                    required
                                />
                            </div>

                            {mfaRequired && (
                                <div className="form-group">
                                    <label>MFA Code</label>
                                    <input
                                        type="text"
                                        value={mfaCode}
                                        onChange={(e) => setMfaCode(e.target.value)}
                                        placeholder="Enter authenticator code"
                                        required
                                    />
                                </div>
                            )}

                            <button type="submit" className="btn btn-primary" disabled={authLoading}>
                                {authLoading ? 'Please wait...' : mfaRequired ? 'Verify MFA Code' : (isLogin ? 'Sign In' : 'Create Account')}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={resetTokenSent ? handleResetPasswordSubmit : handleForgotPasswordRequest}>
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    placeholder="Enter your account email"
                                    required
                                />
                            </div>

                            {resetTokenSent && (
                                <>
                                    <div className="form-group">
                                        <label>Reset Token</label>
                                        <input
                                            type="text"
                                            value={resetToken}
                                            onChange={(e) => setResetToken(e.target.value)}
                                            placeholder="Enter reset token"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>New Password</label>
                                        <input
                                            type="password"
                                            value={newPasswordReset}
                                            onChange={(e) => setNewPasswordReset(e.target.value)}
                                            placeholder="Enter a new password"
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            <button type="submit" className="btn btn-primary" disabled={authLoading}>
                                {authLoading ? 'Please wait...' : resetTokenSent ? 'Reset Password' : 'Send Reset Token'}
                            </button>
                        </form>
                    )}

                    {(mfaRequired || mfaSetup) && (
                        <div className="mfa-setup-box">
                            <h2>MFA Setup</h2>
                            {mfaSetup?.secret ? (
                                <>
                                    <p>{mfaSetup.message || 'Scan the QR code or copy the secret into your authenticator app.'}</p>
                                    {(mfaQrUrl || mfaSetup.otpauthUrl) && (
                                        <div className="qr-code-wrapper">
                                            <img
                                                src={mfaQrUrl || `https://api.qrserver.com/v1/create-qr-code?size=220x220&data=${encodeURIComponent(mfaSetup.otpauthUrl)}`}
                                                alt="MFA QR Code"
                                            />
                                        </div>
                                    )}
                                    <div className="mfa-secret-row">
                                        <div>
                                            <p><strong>Secret:</strong></p>
                                            <p className="mfa-secret-value">{mfaSetup.secret}</p>
                                        </div>
                                        <button
                                            className="btn btn-copy"
                                            type="button"
                                            onClick={async () => {
                                                try {
                                                    await navigator.clipboard.writeText(mfaSetup.secret);
                                                    setAuthError('Secret copied to clipboard');
                                                    setTimeout(() => setAuthError(''), 2500);
                                                } catch (error) {
                                                    setAuthError('Copy failed. Please copy manually.');
                                                }
                                            }}
                                        >
                                            Copy Secret
                                        </button>
                                    </div>
                                    {mfaSetup.otpauthUrl && (
                                        <p><a href={mfaSetup.otpauthUrl} target="_blank" rel="noreferrer">Open authenticator setup</a></p>
                                    )}
                                </>
                            ) : (
                                <>
                                    <p>{mfaSetup?.message || 'This account already has MFA enabled. Enter the code from your authenticator app.'}</p>
                                    {mfaSetup?.otpauthUrl && (
                                        <p><a href={mfaSetup.otpauthUrl} target="_blank" rel="noreferrer">Open authenticator setup</a></p>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px' }}>
                        <div style={{ marginBottom: '15px', color: '#666', fontSize: '0.9rem', fontWeight: 'bold' }}>OR</div>
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setAuthError('Google Login failed')}
                            useOneTap
                        />
                    </div>

                    <div className="auth-switch">
                        {forgotPasswordMode ? (
                            <>
                                <span>Remembered your password? </span>
                                <button onClick={() => {
                                    setForgotPasswordMode(false);
                                    setAuthError('');
                                    setResetTokenSent(false);
                                    setResetMessage('');
                                    setForgotEmail('');
                                    setResetToken('');
                                    setNewPasswordReset('');
                                }}>
                                    Back to Sign In
                                </button>
                            </>
                        ) : (
                            <>
                                {isLogin ? "Don't have an account? " : "Already have an account? "}
                                <button onClick={() => {
                                    setIsLogin(!isLogin);
                                    setAuthError('');
                                    setMfaRequired(false);
                                    setMfaTempToken('');
                                    setMfaCode('');
                                    setMfaSetup(null);
                                    setMfaQrUrl('');
                                }}>
                                    {isLogin ? 'Sign Up' : 'Sign In'}
                                </button>
                                {isLogin && (
                                    <button
                                        className="link-button"
                                        type="button"
                                        onClick={() => {
                                            setForgotPasswordMode(true);
                                            setAuthError('');
                                            setResetTokenSent(false);
                                            setResetMessage('');
                                        }}
                                    >
                                        Forgot password?
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Todo App Screen
    const completedCount = todos.filter(t => t.completed).length;

    return (
        <div className="container">
            <div className="todo-header">
                <div className="header-top">
                    <h1 className="header-title">My <span>Tasks</span></h1>
                    <div className="user-info">
                        <span className="user-name">Hi, {user?.username}</span>
                        <button className="btn-logout" onClick={handleLogout}>Logout</button>
                    </div>
                </div>

                <form className="add-todo-form" onSubmit={addTodo}>
                    <input
                        type="text"
                        value={newTodo.title}
                        onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                        placeholder="Task title"
                        required
                    />
                    <input
                        type="text"
                        value={newTodo.description}
                        onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                        placeholder="Description (optional)"
                    />
                    <div className="todo-meta-inputs">
                        <input
                            type="date"
                            value={newTodo.dueDate}
                            onChange={(e) => setNewTodo({ ...newTodo, dueDate: e.target.value })}
                        />
                        <select
                            value={newTodo.priority}
                            onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value })}
                        >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                    </div>
                    <button type="submit" className="btn-add">Add Task</button>
                </form>

                <div className="subscribe-row">
                    <span>Subscription: <strong>{subscriptionStatus === 'active' ? 'Active' : 'Free'}</strong></span>
                    {subscriptionStatus !== 'active' && (
                        <button className="btn-subscribe" type="button" onClick={handleSubscribe}>Subscribe</button>
                    )}
                </div>

                {paymentError && <div className="error-message">{paymentError}</div>}

                {todos.length > 0 && (
                    <div className="stats">
                        <div className="stat-item">Total: <span>{todos.length}</span></div>
                        <div className="stat-item">Completed: <span>{completedCount}</span></div>
                        <div className="stat-item">Pending: <span>{todos.length - completedCount}</span></div>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="loading">Loading tasks...</div>
            ) : todos.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📝</div>
                    <div className="empty-title">No tasks yet</div>
                    <div className="empty-text">Add your first task to get started!</div>
                </div>
            ) : (
                <div className="todo-list">
                    {todos.map(todo => (
                        <div key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                            <div
                                className={`todo-checkbox ${todo.completed ? 'checked' : ''}`}
                                onClick={() => toggleTodo(todo.id)}
                            />
                            <div className="todo-content">
                                <div className="todo-title">{todo.title}</div>
                                {todo.description && <div className="todo-description">{todo.description}</div>}
                                <div className="todo-meta">
                                    {todo.due_date && <span>Due: {new Date(todo.due_date).toLocaleDateString()}</span>}
                                    <span>Priority: {todo.priority || 'Medium'}</span>
                                </div>
                            </div>
                            <div className="todo-actions">
                                <button className="btn-delete" onClick={() => deleteTodo(todo.id)}>🗑</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default App;
