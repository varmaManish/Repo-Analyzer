// session.js - Complete session management for multiple HTML files
// Prevents back navigation to login after authentication

class SecureSessionManager {
    constructor() {
        this.currentPath = window.location.pathname;
        this.sessionCheckInterval = null;
        this.isInitialized = false;
        
        console.log('🔐 SecureSessionManager initializing on:', this.currentPath);
        
        // Initialize immediately
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        console.log('🚀 Initializing session manager');
        
        // Detect page type and handle accordingly
        this.handlePageLoad();
        
        // Setup navigation protection
        this.setupNavigationProtection();
        
        // Setup session monitoring
        this.setupSessionMonitoring();
        
        // Setup event listeners
        this.setupEventListeners();
    }

    handlePageLoad() {
        const token = this.getAuthToken();
        const isLoggedIn = !!token;
        
        console.log(`🔍 Page analysis: path=${this.currentPath}, token=${!!token}`);

        if (this.isLoginPage()) {
            console.log('📝 Detected login page');
            if (isLoggedIn) {
                console.log('👤 User already authenticated, redirecting to main app');
                this.validateTokenAndRedirect();
            } else {
                console.log('👆 User not authenticated, staying on login page');
                this.clearStaleAuthData();
            }
        } else if (this.isProtectedPage()) {
            console.log('🛡️ Detected protected page');
            if (isLoggedIn) {
                console.log('✅ User authenticated, securing page');
                this.validateTokenAndSecurePage();
            } else {
                console.log('❌ No authentication, redirecting to login');
                this.redirectToLogin();
            }
        } else {
            console.log('🌐 Public page detected');
        }
    }

    isLoginPage() {
        const loginPaths = ['/login', '/register', '/login.html', '/register.html'];
        return loginPaths.some(path => 
            this.currentPath === path || 
            this.currentPath.endsWith(path) ||
            window.location.href.includes(path)
        ) || this.currentPath === '/' || this.currentPath === '';
    }

    isProtectedPage() {
        const protectedPaths = ['/app', '/dashboard', '/index.html', '/main', '/home'];
        return protectedPaths.some(path => 
            this.currentPath === path || 
            this.currentPath.endsWith(path) ||
            window.location.href.includes(path)
        ) || (this.currentPath !== '/' && !this.isLoginPage());
    }

    async validateTokenAndRedirect() {
        try {
            const isValid = await this.validateToken();
            if (isValid) {
                console.log('✅ Token valid, redirecting to main app');
                // Use replace to prevent back navigation
                window.location.replace('/index.html');
            } else {
                console.log('❌ Token invalid, clearing auth data');
                this.clearAuthData();
            }
        } catch (error) {
            console.error('🚨 Token validation failed:', error);
            this.clearAuthData();
        }
    }

    async validateTokenAndSecurePage() {
        try {
            const isValid = await this.validateToken();
            if (isValid) {
                console.log('✅ Token valid, securing page');
                this.secureAuthenticatedPage();
            } else {
                console.log('❌ Token invalid, redirecting to login');
                this.handleSessionExpired();
            }
        } catch (error) {
            console.error('🚨 Token validation failed:', error);
            // Don't force logout on network errors, just secure the page
            this.secureAuthenticatedPage();
        }
    }

    async validateToken() {
        const token = this.getAuthToken();
        if (!token) {
            console.log('❌ No token found');
            return false;
        }

        try {
            console.log('🔍 Validating token with server');
            const response = await fetch('/auth/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });

            if (response.ok) {
                console.log('✅ Token validation successful');
                return true;
            } else {
                console.log(`❌ Token validation failed: ${response.status}`);
                return false;
            }
        } catch (error) {
            console.error('💥 Token validation error:', error);
            throw error;
        }
    }

    secureAuthenticatedPage() {
        console.log('🔒 Securing authenticated page');
        
        // Prevent page caching
        this.preventPageCaching();
        
        // Setup history manipulation to prevent back navigation
        this.preventBackNavigation();
        
        // Start session monitoring
        this.startSessionMonitoring();
    }

    preventPageCaching() {
        // Add no-cache headers dynamically
        const addMetaTag = (httpEquiv, content) => {
            const meta = document.createElement('meta');
            meta.httpEquiv = httpEquiv;
            meta.content = content;
            document.head.appendChild(meta);
        };

        addMetaTag('Cache-Control', 'no-cache, no-store, must-revalidate, private');
        addMetaTag('Pragma', 'no-cache');
        addMetaTag('Expires', '0');
        
        console.log('🚫 Page caching disabled');
    }

    preventBackNavigation() {
        console.log('🛡️ Setting up back navigation prevention');
        
        // Clear any existing history that might contain login pages
        history.replaceState({
            authenticated: true,
            timestamp: Date.now(),
            page: 'protected'
        }, '', window.location.href);

        // Add a dummy entry to prevent immediate back navigation
        history.pushState({
            authenticated: true,
            timestamp: Date.now(),
            page: 'protected'
        }, '', window.location.href);

        console.log('✅ History state secured');
    }

    setupNavigationProtection() {
        // Handle browser navigation (back/forward buttons)
        window.addEventListener('popstate', (event) => {
            console.log('🔙 Navigation event detected:', event.state);
            this.handleNavigationAttempt(event);
        });

        // Handle page unload (prevent accidental navigation)
        window.addEventListener('beforeunload', (event) => {
            if (this.isProtectedPage() && this.getAuthToken()) {
                console.log('⚠️ User attempting to leave protected page');
                // Optionally show confirmation dialog
                // event.preventDefault();
                // event.returnValue = 'Are you sure you want to leave?';
            }
        });
    }

    handleNavigationAttempt(event) {
        const token = this.getAuthToken();
        
        if (!token) {
            console.log('❌ No token during navigation, allowing navigation');
            return;
        }

        if (this.isProtectedPage()) {
            console.log('🛡️ Preventing back navigation from protected page');
            
            // Validate session before deciding
            this.validateToken().then(isValid => {
                if (isValid) {
                    console.log('✅ Session valid, preventing back navigation');
                    // Push state again to prevent navigation
                    history.pushState({
                        authenticated: true,
                        timestamp: Date.now(),
                        page: 'protected'
                    }, '', window.location.href);
                } else {
                    console.log('❌ Session invalid, allowing navigation to login');
                    this.handleSessionExpired();
                }
            });
        }
    }

    setupSessionMonitoring() {
        if (this.isProtectedPage()) {
            this.startSessionMonitoring();
        }
    }

    startSessionMonitoring() {
        console.log('👁️ Starting session monitoring');
        
        // Clear any existing interval
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
        }

        // Check session every 5 minutes
        this.sessionCheckInterval = setInterval(() => {
            console.log('🔍 Periodic session check');
            this.validateToken().then(isValid => {
                if (!isValid) {
                    console.log('⏰ Session expired during periodic check');
                    this.handleSessionExpired();
                }
            });
        }, 5 * 60 * 1000);

        // Check session on page focus
        window.addEventListener('focus', () => {
            console.log('👀 Page focused, validating session');
            this.validateToken().then(isValid => {
                if (!isValid) {
                    console.log('⏰ Session expired on focus');
                    this.handleSessionExpired();
                }
            });
        });

        // Check session on visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('👁️ Page visible, validating session');
                this.validateToken().then(isValid => {
                    if (!isValid) {
                        console.log('⏰ Session expired on visibility change');
                        this.handleSessionExpired();
                    }
                });
            }
        });
    }

    setupEventListeners() {
        // Listen for custom authentication events
        window.addEventListener('auth:login', (event) => {
            console.log('🎉 Login event received');
            this.handleLoginSuccess(event.detail);
        });

        window.addEventListener('auth:logout', () => {
            console.log('👋 Logout event received');
            this.handleLogout();
        });

        // Listen for storage changes (multi-tab support)
        window.addEventListener('storage', (event) => {
            if (event.key === 'auth_token') {
                console.log('🔄 Token changed in another tab');
                if (!event.newValue) {
                    console.log('❌ Token removed, logging out');
                    this.handleLogout();
                }
            }
        });
    }

    handleLoginSuccess(data) {
        console.log('✅ Handling successful login');
        
        // Secure the current page
        this.secureAuthenticatedPage();
        
        // Redirect to main app if still on login page
        if (this.isLoginPage()) {
            console.log('🚀 Redirecting from login to main app');
            setTimeout(() => {
                window.location.replace('/index.html');
            }, 100);
        }
    }

    handleLogout() {
        console.log('👋 Handling logout');
        
        // Clear session monitoring
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
        }

        // Clear authentication data
        this.clearAuthData();

        // Show logout message
        this.showMessage('👋 Logged out successfully', 'success');

        // Redirect to login
        setTimeout(() => {
            window.location.replace('/login.html');
        }, 1500);
    }

    handleSessionExpired() {
        console.log('⏰ Handling session expiration');
        
        // Clear session monitoring
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
        }

        // Clear authentication data
        this.clearAuthData();

        // Show expiration message
        this.showMessage('⏰ Session expired. Please log in again.', 'error');

        // Redirect to login
        setTimeout(() => {
            window.location.replace('/login.html?expired=true');
        }, 2000);
    }

    redirectToLogin() {
        console.log('🔄 Redirecting to login');
        window.location.replace('/login.html');
    }

    getAuthToken() {
        return localStorage.getItem('auth_token');
    }

    clearAuthData() {
        console.log('🧹 Clearing authentication data');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        sessionStorage.clear();
    }

    clearStaleAuthData() {
        // Clear any stale authentication data when on login page without valid token
        const token = this.getAuthToken();
        if (token) {
            this.validateToken().then(isValid => {
                if (!isValid) {
                    console.log('🧹 Clearing stale auth data');
                    this.clearAuthData();
                }
            });
        }
    }

    showMessage(message, type = 'info') {
        console.log(`📢 ${message}`);
        
        // Remove existing messages
        const existing = document.getElementById('session-message');
        if (existing) {
            existing.remove();
        }

        const colors = {
            success: '#28a745',
            error: '#dc3545',
            info: '#007bff'
        };

        const messageDiv = document.createElement('div');
        messageDiv.id = 'session-message';
        messageDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, ${colors[type]}dd, ${colors[type]}ee);
            color: white;
            padding: 1.5rem 2rem;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 1rem;
            font-weight: 500;
            max-width: 400px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        `;
        messageDiv.textContent = message;

        document.body.appendChild(messageDiv);

        // Auto remove
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 3000);
    }

    // Public methods
    logout() {
        this.handleLogout();
    }

    isAuthenticated() {
        return !!this.getAuthToken();
    }

    async getCurrentUser() {
        const token = this.getAuthToken();
        if (!token) return null;

        try {
            const response = await fetch('/auth/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error getting current user:', error);
        }
        return null;
    }
}

// Initialize session manager
console.log('🔧 Loading SecureSessionManager');
const sessionManager = new SecureSessionManager();

// Make it globally available
window.sessionManager = sessionManager;

// Trigger custom login success event (for integration with existing auth.js)
window.triggerLoginSuccess = function(token, user) {
    window.dispatchEvent(new CustomEvent('auth:login', {
        detail: { token, user }
    }));
};

// Trigger custom logout event
window.triggerLogout = function() {
    window.dispatchEvent(new CustomEvent('auth:logout'));
};

console.log('✅ SecureSessionManager loaded and ready');