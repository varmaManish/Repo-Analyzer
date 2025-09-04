// static/js/auth.js - Complete authentication with logout
import { API_BASE } from './config.js';

class AuthManager {
    constructor() {
        this.token = localStorage.getItem('auth_token');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        this.init();
    }

    init() {
        // Initialize form handlers
        this.initLoginForm();
        this.initRegisterForm();
        
        // Check if user is logged in and redirect appropriately
        this.handleAuthenticationFlow();
    }

    handleAuthenticationFlow() {
        const currentPath = window.location.pathname;
        
        if (this.isLoggedIn()) {
            // User is logged in
            if (currentPath.includes('login') || currentPath.includes('register')) {
                // Redirect to main app if trying to access login/register while logged in
                window.location.href = '/app';
            } else if (currentPath === '/') {
                // Redirect to main app if accessing root while logged in
                window.location.href = '/app';
            }
        } else {
            // User is not logged in
            if (currentPath === '/' || currentPath === '/app') {
                // Redirect to login if trying to access main app without login
                window.location.href = '/login';
            }
        }
    }

    initLoginForm() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }

    initRegisterForm() {
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('loginBtn');
        
        this.setLoading(loginBtn, true);
        this.hideMessages();

        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.setAuthData(data.access_token, data.user);
                this.showSuccess('Login successful! Redirecting to analyzer...');
                setTimeout(() => {
                    window.location.href = '/app';
                }, 1500);
            } else {
                this.showError(data.detail || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Network error. Please try again.');
        } finally {
            this.setLoading(loginBtn, false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const fullName = document.getElementById('fullName').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const registerBtn = document.getElementById('registerBtn');
        
        this.setLoading(registerBtn, true);
        this.hideMessages();

        // Validate passwords match
        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            this.setLoading(registerBtn, false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                    full_name: fullName
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.setAuthData(data.access_token, data.user);
                this.showSuccess('Registration successful! Redirecting to analyzer...');
                setTimeout(() => {
                    window.location.href = '/app';
                }, 1500);
            } else {
                this.showError(data.detail || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showError('Network error. Please try again.');
        } finally {
            this.setLoading(registerBtn, false);
        }
    }

    async handleGoogleLogin(idToken) {
        console.log('Processing Google authentication with token:', idToken?.substring(0, 50) + '...');
        
        this.hideMessages();
        
        // Show loading state (if we have a Google button to disable)
        const googleBtn = document.getElementById('googleSignInBtn') || document.getElementById('googleSignUpBtn');
        if (googleBtn) {
            googleBtn.disabled = true;
            googleBtn.textContent = 'Signing in...';
        }
        
        try {
            console.log('Sending Google token to backend...');
            
            const response = await fetch(`${API_BASE}/auth/google`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id_token: idToken })
            });

            console.log('Backend response status:', response.status);
            
            const data = await response.json();
            console.log('Backend response data:', data);

            if (response.ok) {
                console.log('Google authentication successful');
                this.setAuthData(data.access_token, data.user);
                this.showSuccess('Google login successful! Redirecting to analyzer...');
                setTimeout(() => {
                    window.location.href = '/app';
                }, 1500);
            } else {
                console.error('Google authentication failed:', data);
                this.showError(data.detail || 'Google login failed');
            }
        } catch (error) {
            console.error('Google login error:', error);
            this.showError('Google authentication failed. Please try again.');
        } finally {
            // Reset button state
            if (googleBtn) {
                googleBtn.disabled = false;
                googleBtn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 18 18">
                        <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                        <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 01-2.7.75 4.8 4.8 0 01-4.52-3.31H1.83v2.07A8 8 0 008.98 17z"/>
                        <path fill="#FBBC05" d="M4.46 10.46a4.8 4.8 0 010-3.04V5.35H1.83a8 8 0 000 7.18l2.63-2.07z"/>
                        <path fill="#EA4335" d="M8.98 3.58c1.32 0 2.5.45 3.44 1.35l2.54-2.54A8 8 0 001.83 5.35l2.63 2.07A4.8 4.8 0 018.98 3.58z"/>
                    </svg>
                    ${window.location.pathname.includes('register') ? 'Sign up with Google' : 'Sign in with Google'}
                `;
            }
        }
    }

    setAuthData(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user', JSON.stringify(user));
    }

    logout() {
        console.log('Logging out user...');
        
        // Clear authentication data
        this.token = null;
        this.user = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        
        // Optional: Call logout endpoint
        this.callLogoutEndpoint();
        
        // Show logout message briefly
        this.showLogoutMessage();
        
        // Redirect to login page after a short delay
        setTimeout(() => {
            window.location.href = '/login';
        }, 1000);
    }

    async callLogoutEndpoint() {
        try {
            // Call the logout endpoint if available
            await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.log('Logout endpoint call failed:', error);
            // This is not critical, continue with client-side logout
        }
    }

    showLogoutMessage() {
        // Create and show a temporary logout message
        const logoutMessage = document.createElement('div');
        logoutMessage.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 2rem 3rem;
            border-radius: 12px;
            font-size: 1.1rem;
            font-weight: 600;
            z-index: 10000;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            text-align: center;
        `;
        logoutMessage.innerHTML = `
            <div style="margin-bottom: 0.5rem;">✅</div>
            <div>Successfully logged out</div>
            <div style="font-size: 0.9rem; opacity: 0.7; margin-top: 0.5rem;">Redirecting to login...</div>
        `;
        
        document.body.appendChild(logoutMessage);
        
        // Remove the message after a delay
        setTimeout(() => {
            if (logoutMessage.parentNode) {
                logoutMessage.parentNode.removeChild(logoutMessage);
            }
        }, 1500);
    }

    isLoggedIn() {
        return !!this.token && !!this.user;
    }

    getAuthHeaders() {
        if (this.token) {
            return {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            };
        }
        return { 'Content-Type': 'application/json' };
    }

    async getCurrentUser() {
        if (!this.token) return null;

        try {
            const response = await fetch(`${API_BASE}/auth/me`, {
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const user = await response.json();
                this.user = user;
                localStorage.setItem('user', JSON.stringify(user));
                return user;
            } else {
                // Token might be expired
                this.logout();
                return null;
            }
        } catch (error) {
            console.error('Get current user error:', error);
            return null;
        }
    }

    setLoading(button, isLoading) {
        if (isLoading) {
            button.disabled = true;
            button.classList.add('loading');
        } else {
            button.disabled = false;
            button.classList.remove('loading');
        }
    }

    showError(message) {
        const errorEl = document.getElementById('error');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            
            // Hide after 10 seconds for Google errors (they tend to be longer)
            setTimeout(() => {
                errorEl.style.display = 'none';
            }, 10000);
        }
    }

    showSuccess(message) {
        const successEl = document.getElementById('success');
        if (successEl) {
            successEl.textContent = message;
            successEl.style.display = 'block';
        }
    }

    hideMessages() {
        const errorEl = document.getElementById('error');
        const successEl = document.getElementById('success');
        
        if (errorEl) errorEl.style.display = 'none';
        if (successEl) successEl.style.display = 'none';
    }

    // Add authentication UI to main page
    initMainPageAuth() {
        // Only run this on the main app page
        if (!window.location.pathname.includes('/app') && window.location.pathname !== '/') {
            return;
        }

        const header = document.querySelector('.header');
        if (!header) return;

        // Remove existing auth section
        const existingAuthSection = header.querySelector('.auth-section');
        if (existingAuthSection) {
            existingAuthSection.remove();
        }

        // Create auth section
        const authSection = document.createElement('div');
        authSection.className = 'auth-section';
        authSection.style.cssText = `
            position: absolute;
            top: 1rem;
            right: 1rem;
            display: flex;
            gap: 0.5rem;
            align-items: center;
            z-index: 10;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        `;

        if (this.isLoggedIn()) {
            // Show user info and logout button
            authSection.innerHTML = `
                <div class="user-info" style="
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 12px;
                    padding: 0.75rem 1.25rem;
                    color: white;
                    font-size: 0.9rem;
                    font-weight: 500;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                ">
                    <div style="
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    ">
                        <div style="
                            width: 32px;
                            height: 32px;
                            background: linear-gradient(45deg, #00d4ff, #ff0080);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 1rem;
                            font-weight: 600;
                            color: white;
                        ">
                            ${this.user.full_name ? this.user.full_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div style="
                            display: flex;
                            flex-direction: column;
                            gap: 0.125rem;
                        ">
                            <span style="font-weight: 600; font-size: 0.85rem;">
                                ${this.user.full_name || 'User'}
                            </span>
                            <span style="opacity: 0.7; font-size: 0.75rem;">
                                ${this.user.auth_provider === 'google' ? 'Google Account' : 'Local Account'}
                            </span>
                        </div>
                    </div>
                    <button onclick="authManager.logout()" id="logoutBtn" style="
                        background: linear-gradient(135deg, rgba(255, 59, 48, 0.8), rgba(255, 59, 48, 0.6));
                        border: 1px solid rgba(255, 59, 48, 0.4);
                        color: white;
                        border-radius: 8px;
                        padding: 0.5rem 1rem;
                        font-size: 0.8rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        backdrop-filter: blur(10px);
                        display: flex;
                        align-items: center;
                        gap: 0.25rem;
                        min-width: fit-content;
                    " 
                    onmouseover="this.style.background='linear-gradient(135deg, rgba(255, 59, 48, 1), rgba(255, 59, 48, 0.8))'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 24px rgba(255, 59, 48, 0.3)';"
                    onmouseout="this.style.background='linear-gradient(135deg, rgba(255, 59, 48, 0.8), rgba(255, 59, 48, 0.6))'; this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 17v-3H9v-4h7V7l5 5-5 5zM14 2a2 2 0 012 2v2h-2V4H5v16h9v-2h2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2h9z"/>
                        </svg>
                        Logout
                    </button>
                </div>
            `;
        } else {
            // Redirect to login if not authenticated
            window.location.href = '/login';
            return;
        }

        header.appendChild(authSection);
    }
}

// Create global auth manager instance
const authManager = new AuthManager();

// Expose functions to global scope for HTML onclick handlers
window.authManager = authManager;
window.handleGoogleLogin = (idToken) => authManager.handleGoogleLogin(idToken);
window.handleGoogleSignIn = (response) => {
    console.log('handleGoogleSignIn called with:', response);
    return authManager.handleGoogleLogin(response.credential);
};
window.handleGoogleSignUp = (response) => {
    console.log('handleGoogleSignUp called with:', response);
    return authManager.handleGoogleLogin(response.credential);
};

// Export for module usage
export { authManager };
export { AuthManager };
export const handleGoogleLogin = (idToken) => authManager.handleGoogleLogin(idToken);