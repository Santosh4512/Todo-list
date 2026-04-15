import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import QRCode from 'qrcode';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

function App() {
    const [token, setToken] = useState(sessionStorage.getItem('token'));
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
    const [todos, setTodos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newTodo, setNewTodo] = useState('');

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
                    setMfaRequired(true);
                    setMfaTempToken(data.tempToken);
                    setMfaSetup(data.mfaSetup || null);
                    setAuthError('Enter the code from your authenticator app to complete login.');
                } else {
                    sessionStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    setToken(data.token);
                    setUser(data.user);
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
        try {
            const res = await fetch(`${API_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: credentialResponse.credential })
            });
            const data = await res.json();
            if (res.ok) {
                if (data.mfaRequired) {
                    setMfaRequired(true);
                    setMfaTempToken(data.tempToken);
                    setMfaSetup(data.mfaSetup || null);
                    setAuthError('Enter the code from your authenticator app to complete login.');
                } else {
                    sessionStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    setToken(data.token);
                    setUser(data.user);
                }
            } else {
                setAuthError(data.error || 'Google authentication failed');
            }
        } catch (err) {
            setAuthError(err?.message || 'Network error with Google sign-in.');
        }
        setAuthLoading(false);
    };

    const handleLogout = () => {
        sessionStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        setTodos([]);
        setMfaRequired(false);
        setMfaTempToken('');
        setMfaCode('');
        setMfaSetup(null);
        setMfaQrUrl('');
        setAuthForm({ username: '', email: '', password: '' });
    };

    const addTodo = async (e) => {
        e.preventDefault();
        if (!newTodo.trim()) return;

        try {
            const res = await fetch(`${API_URL}/todos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ title: newTodo })
            });

            if (res.ok) {
                const todo = await res.json();
                setTodos([todo, ...todos]);
                setNewTodo('');
            }
        } catch (err) {
            console.error('Failed to add todo');
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

                    {(mfaRequired || mfaSetup) && (
                        <div className="mfa-setup-box">
                            <h2>MFA Setup</h2>
                            {mfaSetup?.secret ? (
                                <>
                                    <p>{mfaSetup.message || 'Scan the QR code or copy the secret into your authenticator app.'}</p>
                                    {mfaQrUrl && (
                                        <div className="qr-code-wrapper">
                                            <img src={mfaQrUrl} alt="MFA QR Code" />
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
                        value={newTodo}
                        onChange={(e) => setNewTodo(e.target.value)}
                        placeholder="Add a new task..."
                    />
                    <button type="submit" className="btn-add">Add</button>
                </form>

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
