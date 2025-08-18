class AuthManager {
            constructor() {
                this.currentUser = null;
                this.users = new Map();
                this.sessions = new Map();
                this.userProfiles = new Map(); // Store user-specific data
                this.initializePersistentStorage();
                this.initializeDemoUsers();
            }

            // Initialize persistent storage system
            initializePersistentStorage() {
                // Load existing users from localStorage
                const savedUsers = localStorage.getItem('liveline_users');
                if (savedUsers) {
                    try {
                        const usersData = JSON.parse(savedUsers);
                        Object.entries(usersData).forEach(([email, userData]) => {
                            // Convert date strings back to Date objects
                            userData.createdAt = new Date(userData.createdAt);
                            if (userData.lastLogin) userData.lastLogin = new Date(userData.lastLogin);
                            this.users.set(email, userData);
                        });
                    } catch (error) {
                        console.error('Error loading saved users:', error);
                    }
                }

                // Load user profiles (preferences, history, etc.)
                const savedProfiles = localStorage.getItem('liveline_user_profiles');
                if (savedProfiles) {
                    try {
                        const profilesData = JSON.parse(savedProfiles);
                        Object.entries(profilesData).forEach(([userId, profile]) => {
                            // Convert date strings back to Date objects in history
                            if (profile.ticketHistory) {
                                profile.ticketHistory = profile.ticketHistory.map(ticket => ({
                                    ...ticket,
                                    joinedAt: new Date(ticket.joinedAt),
                                    calledAt: ticket.calledAt ? new Date(ticket.calledAt) : null,
                                    completedAt: ticket.completedAt ? new Date(ticket.completedAt) : null,
                                    leftAt: ticket.leftAt ? new Date(ticket.leftAt) : null
                                }));
                            }
                            this.userProfiles.set(userId, profile);
                        });
                    } catch (error) {
                        console.error('Error loading user profiles:', error);
                    }
                }
            }

            // Save users to localStorage
            saveUsersToStorage() {
                try {
                    const usersData = {};
                    this.users.forEach((user, email) => {
                        usersData[email] = user;
                    });
                    localStorage.setItem('liveline_users', JSON.stringify(usersData));
                } catch (error) {
                    console.error('Error saving users:', error);
                }
            }

            // Save user profiles to localStorage
            saveUserProfilesToStorage() {
                try {
                    const profilesData = {};
                    this.userProfiles.forEach((profile, userId) => {
                        profilesData[userId] = profile;
                    });
                    localStorage.setItem('liveline_user_profiles', JSON.stringify(profilesData));
                } catch (error) {
                    console.error('Error saving user profiles:', error);
                }
            }

            // Get or create user profile
            getUserProfile(userId) {
                if (!this.userProfiles.has(userId)) {
                    this.userProfiles.set(userId, {
                        userId: userId,
                        preferences: {
                            notifications: true,
                            autoRefresh: true,
                            preferredServices: [],
                            theme: 'light'
                        },
                        ticketHistory: [],
                        statistics: {
                            totalTickets: 0,
                            totalWaitTime: 0,
                            averageWaitTime: 0,
                            favoriteService: null,
                            completedTickets: 0,
                            cancelledTickets: 0
                        },
                        lastActivity: new Date(),
                        createdAt: new Date()
                    });
                    this.saveUserProfilesToStorage();
                }
                return this.userProfiles.get(userId);
            }

            // Update user profile
            updateUserProfile(userId, updates) {
                const profile = this.getUserProfile(userId);
                Object.assign(profile, updates);
                profile.lastActivity = new Date();
                this.userProfiles.set(userId, profile);
                this.saveUserProfilesToStorage();
                return profile;
            }

            // Initialize demo users (In Next.js: MongoDB seed data)
            initializeDemoUsers() {
                // Only add demo users if they don't exist
                if (!this.users.has('admin@liveline.com')) {
                    const demoUsers = [
                        {
                            id: 'admin-1',
                            email: 'admin@liveline.com',
                            password: 'admin123', // In real app: bcrypt hashed
                            firstName: 'Admin',
                            lastName: 'User',
                            role: 'admin',
                            phone: '+1-555-0001',
                            createdAt: new Date(),
                            isActive: true,
                            loginCount: 0
                        },
                        {
                            id: 'customer-1',
                            email: 'customer@liveline.com',
                            password: 'customer123', // In real app: bcrypt hashed
                            firstName: 'John',
                            lastName: 'Doe',
                            role: 'customer',
                            phone: '+1-555-0002',
                            createdAt: new Date(),
                            isActive: true,
                            loginCount: 0
                        }
                    ];

                    demoUsers.forEach(user => {
                        this.users.set(user.email, user);
                    });
                    this.saveUsersToStorage();
                }
            }

            // Login method (In Next.js: /api/auth/login)
            async login(email, password) {
                const user = this.users.get(email);
                
                if (!user) {
                    throw new Error('User not found');
                }

                // In real app: bcrypt.compare(password, user.hashedPassword)
                if (user.password !== password) {
                    throw new Error('Invalid password');
                }

                if (!user.isActive) {
                    throw new Error('Account is deactivated');
                }

                // Store previous login for "last seen" display
                const previousLogin = user.lastLogin;
                
                // Update comprehensive login statistics and user data
                user.lastLogin = new Date();
                user.loginCount = (user.loginCount || 0) + 1;
                user.previousLogin = previousLogin; // Store for display purposes
                
                // Update user activity tracking
                if (!user.loginHistory) user.loginHistory = [];
                user.loginHistory.push({
                    timestamp: new Date(),
                    ip: 'demo-ip', // In real app: req.ip
                    userAgent: 'demo-browser' // In real app: req.headers['user-agent']
                });
                
                // Keep only last 10 login records
                if (user.loginHistory.length > 10) {
                    user.loginHistory = user.loginHistory.slice(-10);
                }
                
                this.users.set(email, user);
                this.saveUsersToStorage();

                // Initialize/load user profile with comprehensive persistent data
                const userProfile = this.getUserProfile(user.id);
                userProfile.lastActivity = new Date();
                userProfile.currentSession = {
                    loginTime: new Date(),
                    isActive: true
                };

                // Create enhanced session (In Next.js: JWT token)
                const sessionId = this.generateSessionId();
                const session = {
                    id: sessionId,
                    userId: user.id,
                    email: user.email,
                    role: user.role,
                    createdAt: new Date(),
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                    loginCount: user.loginCount,
                    isFirstLogin: user.loginCount === 1
                };

                this.sessions.set(sessionId, session);
                this.currentUser = user;

                // Store comprehensive user data in localStorage (In Next.js: HTTP-only cookies)
                localStorage.setItem('sessionId', sessionId);
                localStorage.setItem('user', JSON.stringify({
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    phone: user.phone,
                    role: user.role,
                    loginCount: user.loginCount,
                    lastLogin: user.lastLogin,
                    previousLogin: user.previousLogin,
                    createdAt: user.createdAt,
                    isActive: user.isActive
                }));

                // Save updated profile data
                this.updateUserProfile(user.id, userProfile);

                return { user, session, profile: userProfile };
            }

            // Signup method (In Next.js: /api/auth/signup)
            async signup(userData) {
                const { email, password, confirmPassword, firstName, lastName, phone, role } = userData;

                // Validation
                if (this.users.has(email)) {
                    throw new Error('Email already exists');
                }

                if (password !== confirmPassword) {
                    throw new Error('Passwords do not match');
                }

                if (password.length < 6) {
                    throw new Error('Password must be at least 6 characters');
                }

                // Create new user
                const newUser = {
                    id: this.generateUserId(),
                    email,
                    password, // In real app: await bcrypt.hash(password, 10)
                    firstName,
                    lastName,
                    phone,
                    role,
                    createdAt: new Date(),
                    isActive: true, // Both customer and admin accounts are active immediately
                    loginCount: 0
                };

                this.users.set(email, newUser);
                this.saveUsersToStorage();

                // Create initial user profile with comprehensive data structure
                const userProfile = this.getUserProfile(newUser.id);
                userProfile.accountCreated = new Date();
                userProfile.signupData = {
                    firstName,
                    lastName,
                    phone,
                    role,
                    registrationDate: new Date()
                };
                this.updateUserProfile(newUser.id, userProfile);

                // Return user data without auto-login (force manual login)
                return { 
                    user: newUser, 
                    needsApproval: role === 'admin',
                    success: true,
                    message: 'Account created successfully'
                };
            }

            // Check session validity with comprehensive data restoration (In Next.js: middleware)
            checkSession() {
                const sessionId = localStorage.getItem('sessionId');
                if (!sessionId) return null;

                const session = this.sessions.get(sessionId);
                if (!session || session.expiresAt < new Date()) {
                    this.logout();
                    return null;
                }

                const userData = localStorage.getItem('user');
                if (userData) {
                    try {
                        const parsedUser = JSON.parse(userData);
                        
                        // Convert date strings back to Date objects for proper handling
                        if (parsedUser.lastLogin) parsedUser.lastLogin = new Date(parsedUser.lastLogin);
                        if (parsedUser.previousLogin) parsedUser.previousLogin = new Date(parsedUser.previousLogin);
                        if (parsedUser.createdAt) parsedUser.createdAt = new Date(parsedUser.createdAt);
                        
                        this.currentUser = parsedUser;
                        
                        // Restore user profile data and update activity
                        const userProfile = this.getUserProfile(parsedUser.id);
                        userProfile.lastActivity = new Date();
                        userProfile.sessionRestored = new Date();
                        this.updateUserProfile(parsedUser.id, userProfile);
                        
                        return this.currentUser;
                    } catch (error) {
                        console.error('Error parsing stored user data:', error);
                        this.logout();
                        return null;
                    }
                }

                return null;
            }

            // Logout method
            logout() {
                const sessionId = localStorage.getItem('sessionId');
                if (sessionId) {
                    this.sessions.delete(sessionId);
                }
                
                localStorage.removeItem('sessionId');
                localStorage.removeItem('user');
                this.currentUser = null;
            }

            // Utility methods
            generateSessionId() {
                return 'sess_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
            }

            generateUserId() {
                return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
            }

            isAdmin() {
                return this.currentUser && this.currentUser.role === 'admin';
            }

            isCustomer() {
                return this.currentUser && this.currentUser.role === 'customer';
            }
        }

        // Queue Management System (Enhanced with user tracking and persistence)
        class QueueManager {
            constructor() {
                this.queues = new Map();
                this.userTickets = new Map(); // Track user tickets
                this.ticketHistory = new Map(); // User ticket history
                this.socket = null;
                this.autoRefresh = true;
                this.initializePersistentQueues();
                this.connectWebSocket();
            }

            // Initialize queues with persistent data
            initializePersistentQueues() {
                // Load saved queue data
                const savedQueues = localStorage.getItem('liveline_queues');
                if (savedQueues) {
                    try {
                        const queuesData = JSON.parse(savedQueues);
                        Object.entries(queuesData).forEach(([service, queueData]) => {
                            // Convert date strings back to Date objects
                            if (queueData.customers) {
                                queueData.customers = queueData.customers.map(customer => ({
                                    ...customer,
                                    joinedAt: new Date(customer.joinedAt)
                                }));
                            }
                            if (queueData.currentlyServing && queueData.currentlyServing.joinedAt) {
                                queueData.currentlyServing.joinedAt = new Date(queueData.currentlyServing.joinedAt);
                            }
                            queueData.lastUpdated = new Date(queueData.lastUpdated);
                            this.queues.set(service, queueData);
                        });
                    } catch (error) {
                        console.error('Error loading saved queues:', error);
                        this.initializeQueues();
                    }
                } else {
                    this.initializeQueues();
                }

                // Load user tickets
                const savedUserTickets = localStorage.getItem('liveline_user_tickets');
                if (savedUserTickets) {
                    try {
                        const ticketsData = JSON.parse(savedUserTickets);
                        Object.entries(ticketsData).forEach(([userId, ticket]) => {
                            ticket.joinedAt = new Date(ticket.joinedAt);
                            this.userTickets.set(userId, ticket);
                        });
                    } catch (error) {
                        console.error('Error loading user tickets:', error);
                    }
                }
            }

            // Save queue data to localStorage
            saveQueuesToStorage() {
                try {
                    const queuesData = {};
                    this.queues.forEach((queue, service) => {
                        queuesData[service] = queue;
                    });
                    localStorage.setItem('liveline_queues', JSON.stringify(queuesData));
                } catch (error) {
                    console.error('Error saving queues:', error);
                }
            }

            // Save user tickets to localStorage
            saveUserTicketsToStorage() {
                try {
                    const ticketsData = {};
                    this.userTickets.forEach((ticket, userId) => {
                        ticketsData[userId] = ticket;
                    });
                    localStorage.setItem('liveline_user_tickets', JSON.stringify(ticketsData));
                } catch (error) {
                    console.error('Error saving user tickets:', error);
                }
            }

            initializeQueues() {
                const services = ['bank', 'hospital', 'government'];
                const serviceTimes = { bank: 5, hospital: 8, government: 10 };
                
                services.forEach(service => {
                    this.queues.set(service, {
                        customers: [],
                        currentlyServing: null,
                        isPaused: false,
                        totalServed: 0,
                        averageServiceTime: serviceTimes[service],
                        lastUpdated: new Date()
                    });
                });
            }

            connectWebSocket() {
                console.log('🔌 Connecting to WebSocket...');
                setTimeout(() => {
                    this.socket = { connected: true };
                    this.updateConnectionStatus(true);
                    this.startRealTimeUpdates();
                }, 1000);
            }

            startRealTimeUpdates() {
                setInterval(() => {
                    if (this.autoRefresh) {
                        this.broadcastQueueUpdate();
                    }
                }, 3000);
            }

            // Enhanced join queue with user tracking and persistence
            async joinQueue(service, userId) {
                const queue = this.queues.get(service);
                const user = authManager.currentUser;
                
                const customer = {
                    id: this.generateId(),
                    ticketNumber: this.generateTicketNumber(service),
                    service: service,
                    userId: userId,
                    userName: `${user.firstName} ${user.lastName}`,
                    userEmail: user.email,
                    joinedAt: new Date(),
                    estimatedWaitTime: queue.customers.length * queue.averageServiceTime,
                    status: 'waiting'
                };

                queue.customers.push(customer);
                queue.lastUpdated = new Date();
                
                // Track user ticket
                this.userTickets.set(userId, customer);
                
                // Add to user profile history
                const userProfile = authManager.getUserProfile(userId);
                if (!userProfile.ticketHistory) {
                    userProfile.ticketHistory = [];
                }
                userProfile.ticketHistory.push({
                    ...customer,
                    status: 'active'
                });
                
                // Update user statistics
                userProfile.statistics.totalTickets++;
                if (!userProfile.preferences.preferredServices.includes(service)) {
                    userProfile.preferences.preferredServices.push(service);
                }
                
                // Save all data
                authManager.updateUserProfile(userId, userProfile);
                this.saveQueuesToStorage();
                this.saveUserTicketsToStorage();
                
                this.broadcastQueueUpdate();
                this.showNotification(`Joined ${service} queue. Ticket: ${customer.ticketNumber}`);
                
                return customer;
            }

            // Leave queue with persistence
            async leaveQueue(service, userId) {
                const queue = this.queues.get(service);
                const userTicket = this.userTickets.get(userId);
                
                if (userTicket) {
                    queue.customers = queue.customers.filter(c => c.id !== userTicket.id);
                    this.userTickets.delete(userId);
                    
                    // Update user profile history
                    const userProfile = authManager.getUserProfile(userId);
                    if (userProfile.ticketHistory) {
                        const historyItem = userProfile.ticketHistory.find(h => h.id === userTicket.id);
                        if (historyItem) {
                            historyItem.status = 'cancelled';
                            historyItem.leftAt = new Date();
                        }
                    }
                    
                    // Update statistics
                    userProfile.statistics.cancelledTickets++;
                    
                    // Save all data
                    authManager.updateUserProfile(userId, userProfile);
                    queue.lastUpdated = new Date();
                    this.saveQueuesToStorage();
                    this.saveUserTicketsToStorage();
                    
                    this.broadcastQueueUpdate();
                    this.showNotification('Left the queue');
                }
            }

            // Get user's current ticket
            getUserTicket(userId) {
                return this.userTickets.get(userId);
            }

            // Get user's ticket history from profile
            getUserHistory(userId) {
                const userProfile = authManager.getUserProfile(userId);
                return userProfile.ticketHistory || [];
            }

            // Admin: Call next customer
            async callNextCustomer(service) {
                const queue = this.queues.get(service);
                if (queue.customers.length === 0) return null;

                const nextCustomer = queue.customers.shift();
                queue.currentlyServing = nextCustomer;
                queue.lastUpdated = new Date();
                
                // Update user ticket status
                if (nextCustomer.userId) {
                    this.userTickets.delete(nextCustomer.userId);
                    
                    // Update history
                    const history = this.ticketHistory.get(nextCustomer.userId);
                    if (history) {
                        const historyItem = history.find(h => h.id === nextCustomer.id);
                        if (historyItem) {
                            historyItem.status = 'being_served';
                            historyItem.calledAt = new Date();
                        }
                    }
                }
                
                this.broadcastQueueUpdate();
                this.showNotification(`Now serving: ${nextCustomer.ticketNumber}`);
                
                // Simulate service completion
                setTimeout(() => {
                    this.completeService(service, nextCustomer);
                }, queue.averageServiceTime * 1000);
                
                return nextCustomer;
            }

            completeService(service, customer) {
                const queue = this.queues.get(service);
                if (queue.currentlyServing && queue.currentlyServing.id === customer.id) {
                    queue.totalServed++;
                    queue.currentlyServing = null;
                    queue.lastUpdated = new Date();
                    
                    // Update user profile history and statistics
                    if (customer.userId) {
                        const userProfile = authManager.getUserProfile(customer.userId);
                        if (userProfile.ticketHistory) {
                            const historyItem = userProfile.ticketHistory.find(h => h.id === customer.id);
                            if (historyItem) {
                                historyItem.status = 'completed';
                                historyItem.completedAt = new Date();
                                
                                // Calculate wait time
                                const waitTime = Math.round((historyItem.completedAt - historyItem.joinedAt) / 60000); // minutes
                                historyItem.actualWaitTime = waitTime;
                                
                                // Update statistics
                                userProfile.statistics.completedTickets++;
                                userProfile.statistics.totalWaitTime += waitTime;
                                userProfile.statistics.averageWaitTime = 
                                    Math.round(userProfile.statistics.totalWaitTime / userProfile.statistics.completedTickets);
                                
                                // Update favorite service
                                const serviceCount = userProfile.ticketHistory.filter(t => 
                                    t.service === service && t.status === 'completed'
                                ).length;
                                
                                if (!userProfile.statistics.favoriteService || serviceCount > 
                                    userProfile.ticketHistory.filter(t => 
                                        t.service === userProfile.statistics.favoriteService && t.status === 'completed'
                                    ).length) {
                                    userProfile.statistics.favoriteService = service;
                                }
                                
                                authManager.updateUserProfile(customer.userId, userProfile);
                            }
                        }
                    }
                    
                    this.saveQueuesToStorage();
                    this.broadcastQueueUpdate();
                }
            }

            // Other queue methods remain the same...
            pauseQueue(service) {
                const queue = this.queues.get(service);
                queue.isPaused = !queue.isPaused;
                queue.lastUpdated = new Date();
                this.broadcastQueueUpdate();
                this.showNotification(`Queue ${queue.isPaused ? 'paused' : 'resumed'}`);
            }

            clearQueue(service) {
                const queue = this.queues.get(service);
                
                // Update history for all customers in queue
                queue.customers.forEach(customer => {
                    if (customer.userId) {
                        this.userTickets.delete(customer.userId);
                        const history = this.ticketHistory.get(customer.userId);
                        if (history) {
                            const historyItem = history.find(h => h.id === customer.id);
                            if (historyItem) {
                                historyItem.status = 'cancelled';
                                historyItem.leftAt = new Date();
                            }
                        }
                    }
                });
                
                queue.customers = [];
                queue.currentlyServing = null;
                queue.lastUpdated = new Date();
                this.broadcastQueueUpdate();
                this.showNotification('Queue cleared');
            }

            generateId() {
                return Date.now().toString(36) + Math.random().toString(36).substr(2);
            }

            generateTicketNumber(service) {
                const prefix = service.charAt(0).toUpperCase();
                const number = String(Date.now()).slice(-4);
                return `${prefix}${number}`;
            }

            broadcastQueueUpdate() {
                const event = new CustomEvent('queueUpdate', {
                    detail: { queues: Object.fromEntries(this.queues) }
                });
                document.dispatchEvent(event);
            }

            updateConnectionStatus(connected) {
                const statusEl = document.getElementById('connectionStatus');
                const textEl = statusEl.nextElementSibling;
                
                if (connected) {
                    statusEl.className = 'w-3 h-3 bg-green-500 rounded-full pulse-dot';
                    textEl.textContent = 'Connected';
                } else {
                    statusEl.className = 'w-3 h-3 bg-red-500 rounded-full';
                    textEl.textContent = 'Disconnected';
                }
            }

            showNotification(message) {
                const notification = document.getElementById('notification');
                const text = document.getElementById('notificationText');
                
                text.textContent = message;
                notification.classList.add('show');
                
                setTimeout(() => {
                    notification.classList.remove('show');
                }, 3000);
            }
        }

        // Initialize managers
        const authManager = new AuthManager();
        const queueManager = new QueueManager();

        // Application state
        let selectedService = null;
        let currentAdminService = 'bank';

        // Initialize application
        document.addEventListener('DOMContentLoaded', () => {
            initializeApp();
        });

        function initializeApp() {
            // Check if user is already logged in with persistent session
            const user = authManager.checkSession();
            if (user) {
                // Load user's persistent data
                const userProfile = authManager.getUserProfile(user.id);
                
                // Update last activity
                userProfile.lastActivity = new Date();
                authManager.updateUserProfile(user.id, userProfile);
                
                // Show appropriate interface
                showMainApp(user);
                
                // Show welcome back message
                queueManager.showNotification(`Welcome back, ${user.firstName}!`);
            } else {
                showAuthPages();
                
                // Pre-fill login form with last logged out user's email for easy re-login
                setTimeout(() => {
                    const lastLoggedOutUser = localStorage.getItem('lastLoggedOutUser');
                    if (lastLoggedOutUser) {
                        document.getElementById('loginEmail').value = lastLoggedOutUser;
                        document.getElementById('loginPassword').focus();
                        
                        // Get user's name from stored users for personalized message
                        const userData = authManager.users.get(lastLoggedOutUser);
                        const userName = userData ? userData.firstName : 'User';
                        queueManager.showNotification(`👋 Welcome back! Email ready for ${userName}. Just enter your password.`);
                    }
                }, 300);
            }

            initializeEventListeners();
            updateCurrentTime();
            setInterval(updateCurrentTime, 1000);
        }

        function initializeEventListeners() {
            // Authentication event listeners
            document.getElementById('loginForm').addEventListener('submit', handleLogin);
            document.getElementById('signupForm').addEventListener('submit', handleSignup);
            document.getElementById('showSignupBtn').addEventListener('click', showSignupPage);
            document.getElementById('showLoginBtn').addEventListener('click', showLoginPage);
            document.getElementById('logoutBtn').addEventListener('click', handleLogout);

            // Customer interface
            document.querySelectorAll('.service-btn').forEach(btn => {
                btn.addEventListener('click', () => selectService(btn.dataset.service));
            });
            
            document.getElementById('joinQueueBtn').addEventListener('click', handleJoinQueue);
            document.getElementById('refreshBtn').addEventListener('click', () => {
                updateCustomerDisplay();
                queueManager.showNotification('Queue refreshed');
            });

            // Admin interface
            document.querySelectorAll('.admin-tab-btn').forEach(btn => {
                btn.addEventListener('click', () => switchAdminService(btn.dataset.service));
            });

            document.getElementById('nextCustomerBtn').addEventListener('click', () => {
                queueManager.callNextCustomer(currentAdminService);
            });

            document.getElementById('pauseQueueBtn').addEventListener('click', () => {
                queueManager.pauseQueue(currentAdminService);
            });

            document.getElementById('clearQueueBtn').addEventListener('click', () => {
                if (confirm('Are you sure you want to clear the entire queue?')) {
                    queueManager.clearQueue(currentAdminService);
                }
            });

            document.getElementById('updateSettingsBtn').addEventListener('click', updateServiceSettings);
            document.getElementById('addTestCustomerBtn').addEventListener('click', addTestCustomer);
            document.getElementById('exportDataBtn').addEventListener('click', exportQueueData);
            document.getElementById('resetStatsBtn').addEventListener('click', resetStatistics);
            document.getElementById('autoRefreshToggle').addEventListener('click', toggleAutoRefresh);

            // Listen for queue updates
            document.addEventListener('queueUpdate', () => {
                if (authManager.isCustomer()) {
                    updateCustomerDisplay();
                } else if (authManager.isAdmin()) {
                    updateAdminDisplay();
                }
            });
        }

        // Authentication handlers
        async function handleLogin(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            try {
                const { user, profile } = await authManager.login(email, password);
                
                // Enhanced welcome message with comprehensive user data
                const isFirstLogin = user.loginCount === 1;
                const roleMessage = user.role === 'admin' ? 'Admin Dashboard' : 'Customer Portal';
                const loginMessage = isFirstLogin ? 
                    `🎉 Welcome to LiveLine ${roleMessage}, ${user.firstName}! Your account is now active.` : 
                    `👋 Welcome back to ${roleMessage}, ${user.firstName}! Login #${user.loginCount}`;
                
                queueManager.showNotification(loginMessage);
                
                // Clear login form completely and remove last logged out user since they're now logged in
                document.getElementById('loginForm').reset();
                localStorage.removeItem('lastLoggedOutUser');
                
                // Show main app with all user data loaded and preserved
                showMainApp(user);
                
                // Restore user's active session data
                const activeTicket = queueManager.getUserTicket(user.id);
                if (activeTicket) {
                    selectedService = activeTicket.service;
                    selectService(activeTicket.service);
                    
                    // Show detailed ticket restoration message
                    setTimeout(() => {
                        queueManager.showNotification(`🎫 Active ticket restored: ${activeTicket.ticketNumber} in ${activeTicket.service} queue`);
                    }, 1500);
                }
                
                // Show account statistics for returning users
                if (!isFirstLogin && profile.statistics.totalTickets > 0) {
                    setTimeout(() => {
                        const stats = profile.statistics;
                        queueManager.showNotification(`📊 Your stats: ${stats.totalTickets} total tickets, ${stats.completedTickets} completed, ${stats.averageWaitTime}min avg wait`);
                    }, 2500);
                }
                
            } catch (error) {
                queueManager.showNotification(`❌ Login failed: ${error.message}`);
            }
        }

        async function handleSignup(e) {
            e.preventDefault();
            
            const userData = {
                firstName: document.getElementById('signupFirstName').value,
                lastName: document.getElementById('signupLastName').value,
                email: document.getElementById('signupEmail').value,
                phone: document.getElementById('signupPhone').value,
                password: document.getElementById('signupPassword').value,
                confirmPassword: document.getElementById('signupConfirmPassword').value,
                role: document.getElementById('signupRole').value
            };

            try {
                const result = await authManager.signup(userData);
                
                // Enhanced success messaging with account details
                const successMessage = result.needsApproval ? 
                    `Admin account created for ${userData.firstName}! Please sign in to access your dashboard.` :
                    `Welcome ${userData.firstName}! Your account has been created successfully. Please sign in to continue.`;
                
                queueManager.showNotification(successMessage);
                
                // Clear the signup form completely
                document.getElementById('signupForm').reset();
                
                // Pre-fill login form with the registered email for convenience
                document.getElementById('loginEmail').value = userData.email;
                document.getElementById('loginEmail').focus();
                
                // Smooth transition to login page with animation
                setTimeout(() => {
                    showLoginPage();
                    // Show helpful hint about pre-filled email
                    setTimeout(() => {
                        queueManager.showNotification(`Email pre-filled for ${userData.firstName}. Enter your password to sign in.`);
                    }, 500);
                }, 300);
                
            } catch (error) {
                queueManager.showNotification(`Signup failed: ${error.message}`);
            }
        }

        function handleLogout() {
            const user = authManager.currentUser;
            const userName = user ? user.firstName : 'User';
            const userEmail = user ? user.email : '';
            
            // Update user profile with logout timestamp
            if (user) {
                const userProfile = authManager.getUserProfile(user.id);
                userProfile.lastLogout = new Date();
                if (userProfile.currentSession) {
                    userProfile.currentSession.isActive = false;
                    userProfile.currentSession.logoutTime = new Date();
                }
                authManager.updateUserProfile(user.id, userProfile);
            }
            
            // Clear any active tickets for the user
            if (user && queueManager.getUserTicket(user.id)) {
                const activeTicket = queueManager.getUserTicket(user.id);
                queueManager.leaveQueue(activeTicket.service, user.id);
            }
            
            // Store last logged out user email for easy re-login
            if (userEmail) {
                localStorage.setItem('lastLoggedOutUser', userEmail);
            }
            
            // Perform logout
            authManager.logout();
            
            // Reset application state
            selectedService = null;
            currentAdminService = 'bank';
            
            // Show personalized logout message
            queueManager.showNotification(`👋 Goodbye ${userName}! Sign in again anytime with your saved credentials.`);
            
            // Return to authentication pages with pre-filled email
            showAuthPages();
            
            // Pre-fill login form with last user's email for easy re-login
            setTimeout(() => {
                if (userEmail) {
                    document.getElementById('loginEmail').value = userEmail;
                    document.getElementById('loginPassword').focus();
                    queueManager.showNotification(`Welcome back! Email pre-filled for ${userName}. Enter your password to continue.`);
                }
            }, 500);
        }

        // UI Navigation
        function showAuthPages() {
            document.getElementById('authContainer').classList.remove('hidden');
            document.getElementById('mainApp').classList.add('hidden');
        }

        function showMainApp(user) {
            document.getElementById('authContainer').classList.add('hidden');
            document.getElementById('mainApp').classList.remove('hidden');
            
            // Update user info in header with enhanced details
            document.getElementById('userInitials').textContent = 
                (user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase();
            document.getElementById('userName').textContent = `${user.firstName} ${user.lastName}`;
            
            // Load and display user profile data
            const userProfile = authManager.getUserProfile(user.id);
            
            // Show appropriate interface based on role
            if (user.role === 'admin') {
                document.getElementById('customerInterface').classList.add('hidden');
                document.getElementById('adminInterface').classList.remove('hidden');
                updateAdminDisplay();
                
                // Show admin-specific welcome message
                setTimeout(() => {
                    queueManager.showNotification(`Admin Dashboard Loaded - Total Users: ${authManager.users.size}`);
                }, 1000);
            } else {
                document.getElementById('adminInterface').classList.add('hidden');
                document.getElementById('customerInterface').classList.remove('hidden');
                
                // Load all customer data
                updateUserStatistics();
                updateQueueCounts();
                updateTicketHistory();
                
                // Show customer stats in notification
                setTimeout(() => {
                    const stats = userProfile.statistics;
                    if (stats.totalTickets > 0) {
                        queueManager.showNotification(`Your Stats: ${stats.totalTickets} tickets, ${stats.completedTickets} completed`);
                    }
                }, 1500);
            }
            
            // Update user activity
            userProfile.lastActivity = new Date();
            authManager.updateUserProfile(user.id, userProfile);
        }

        function showLoginPage() {
            document.getElementById('loginPage').classList.remove('hidden');
            document.getElementById('signupPage').classList.add('hidden');
        }

        function showSignupPage() {
            document.getElementById('loginPage').classList.add('hidden');
            document.getElementById('signupPage').classList.remove('hidden');
        }

        // Demo login helpers
        function fillLogin(email, password) {
            document.getElementById('loginEmail').value = email;
            document.getElementById('loginPassword').value = password;
            document.getElementById('loginPassword').focus();
        }

        // Quick login function for instant access
        async function quickLogin(email, password) {
            try {
                // Fill the form first
                document.getElementById('loginEmail').value = email;
                document.getElementById('loginPassword').value = password;
                
                // Show loading state
                queueManager.showNotification('🔄 Logging you in...');
                
                // Perform login
                const { user, profile } = await authManager.login(email, password);
                
                // Enhanced welcome message with role-based redirect
                const roleMessage = user.role === 'admin' ? 'Admin Dashboard' : 'Customer Portal';
                queueManager.showNotification(`✅ Welcome to ${roleMessage}, ${user.firstName}!`);
                
                // Clear form and redirect
                document.getElementById('loginForm').reset();
                localStorage.removeItem('lastLoggedOutUser');
                showMainApp(user);
                
                // Show role-specific welcome message
                setTimeout(() => {
                    if (user.role === 'admin') {
                        queueManager.showNotification('🛠️ Admin tools loaded. Manage queues and monitor activity.');
                    } else {
                        queueManager.showNotification('🎫 Ready to join queues! Select a service to get started.');
                    }
                }, 1500);
                
            } catch (error) {
                queueManager.showNotification(`❌ Quick login failed: ${error.message}`);
            }
        }

        // Customer Interface Functions
        function selectService(service) {
            selectedService = service;
            document.getElementById('queueDisplay').classList.remove('hidden');
            document.getElementById('currentService').textContent = 
                service.charAt(0).toUpperCase() + service.slice(1);
            updateCustomerDisplay();
        }

        async function handleJoinQueue() {
            const userId = authManager.currentUser.id;
            const userTicket = queueManager.getUserTicket(userId);
            
            if (!userTicket) {
                await queueManager.joinQueue(selectedService, userId);
                document.getElementById('ticketInfo').classList.remove('hidden');
                
                const joinBtn = document.getElementById('joinQueueBtn');
                joinBtn.textContent = 'Leave Queue';
                joinBtn.className = 'bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors';
            } else {
                await queueManager.leaveQueue(selectedService, userId);
                document.getElementById('ticketInfo').classList.add('hidden');
                
                const joinBtn = document.getElementById('joinQueueBtn');
                joinBtn.textContent = 'Join Queue';
                joinBtn.className = 'bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors';
            }
            
            updateCustomerDisplay();
            updateTicketHistory();
        }

        function updateCustomerDisplay() {
            if (!selectedService) return;
            
            const queue = queueManager.queues.get(selectedService);
            const userId = authManager.currentUser.id;
            const userTicket = queueManager.getUserTicket(userId);
            
            // Update queue info
            document.getElementById('queueLength').textContent = queue.customers.length;
            document.getElementById('estimatedWait').textContent = `${queue.customers.length * queue.averageServiceTime} min`;
            document.getElementById('nowServing').textContent = 
                queue.currentlyServing ? queue.currentlyServing.ticketNumber : 'None';
            
            // Update user ticket info
            if (userTicket) {
                const position = queue.customers.findIndex(c => c.id === userTicket.id) + 1;
                document.getElementById('ticketNumber').textContent = userTicket.ticketNumber;
                document.getElementById('yourPosition').textContent = position > 0 ? position : 'Not in queue';
                document.getElementById('yourWaitTime').textContent = 
                    position > 0 ? `${position * queue.averageServiceTime} min` : '-';
            }
            
            // Update user statistics
            updateUserStatistics();
            
            // Update queue list
            updateQueueList(queue.customers, 'queueList');
        }

        function updateUserStatistics() {
            const user = authManager.currentUser;
            const userId = user.id;
            const userProfile = authManager.getUserProfile(userId);
            const stats = userProfile.statistics;
            
            // Update account information
            document.getElementById('userFullName').textContent = `${user.firstName} ${user.lastName}`;
            document.getElementById('userEmail').textContent = user.email;
            document.getElementById('userPhone').textContent = user.phone || 'Not provided';
            document.getElementById('userRole').textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
            document.getElementById('userMemberSince').textContent = new Date(user.createdAt).toLocaleDateString();
            document.getElementById('userLastLogin').textContent = user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'First login';
            document.getElementById('userLoginCount').textContent = user.loginCount || 0;
            
            // Update statistics
            document.getElementById('userTotalTickets').textContent = stats.totalTickets || 0;
            document.getElementById('userCompletedTickets').textContent = stats.completedTickets || 0;
            document.getElementById('userAvgWaitTime').textContent = stats.averageWaitTime || 0;
            document.getElementById('userFavoriteService').textContent = 
                stats.favoriteService ? stats.favoriteService.charAt(0).toUpperCase() + stats.favoriteService.slice(1) : '-';
        }

        function updateQueueCounts() {
            // Update service cards with current queue counts
            queueManager.queues.forEach((queue, service) => {
                const countEl = document.getElementById(`${service}Queue`);
                if (countEl) {
                    countEl.textContent = `Queue: ${queue.customers.length}`;
                }
            });
        }

        function updateTicketHistory() {
            const userId = authManager.currentUser.id;
            const history = queueManager.getUserHistory(userId);
            const historyEl = document.getElementById('ticketHistory');
            
            if (history.length === 0) {
                historyEl.innerHTML = '<p class="text-gray-500 text-center py-8">No previous tickets</p>';
                return;
            }
            
            historyEl.innerHTML = history.slice(-10).reverse().map(ticket => {
                const statusColor = {
                    'active': 'bg-blue-100 text-blue-800',
                    'being_served': 'bg-yellow-100 text-yellow-800',
                    'completed': 'bg-green-100 text-green-800',
                    'cancelled': 'bg-red-100 text-red-800'
                };
                
                return `
                    <div class="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                        <div>
                            <span class="font-medium">${ticket.ticketNumber}</span>
                            <span class="text-sm text-gray-600 ml-2">${ticket.service}</span>
                            <p class="text-xs text-gray-500">${ticket.joinedAt.toLocaleString()}</p>
                        </div>
                        <span class="px-2 py-1 rounded-full text-xs font-medium ${statusColor[ticket.status]}">
                            ${ticket.status.replace('_', ' ').toUpperCase()}
                        </span>
                    </div>
                `;
            }).join('');
        }

        // Admin Interface Functions
        function switchAdminService(service) {
            currentAdminService = service;
            
            document.querySelectorAll('.admin-tab-btn').forEach(btn => {
                btn.className = 'admin-tab-btn bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors';
            });
            
            event.target.className = 'admin-tab-btn bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors';
            
            updateAdminDisplay();
        }

        function updateAdminDisplay() {
            const queue = queueManager.queues.get(currentAdminService);
            
            // Update statistics
            document.getElementById('totalServed').textContent = queue.totalServed;
            document.getElementById('avgWaitTime').textContent = `${queue.averageServiceTime} min`;
            document.getElementById('activeUsers').textContent = authManager.sessions.size;
            document.getElementById('serviceTimeInput').value = queue.averageServiceTime;
            document.getElementById('lastUpdated').textContent = queue.lastUpdated.toLocaleTimeString();
            
            // Update pause button
            const pauseBtn = document.getElementById('pauseQueueBtn');
            pauseBtn.textContent = queue.isPaused ? '▶️ Resume Queue' : '⏸️ Pause Queue';
            
            // Update current service status
            const statusDiv = document.getElementById('currentServiceStatus');
            if (queue.currentlyServing) {
                statusDiv.classList.remove('hidden');
                document.getElementById('currentlyServing').textContent = 
                    `${queue.currentlyServing.ticketNumber} (${queue.currentlyServing.userName})`;
                document.getElementById('serviceStartTime').textContent = 
                    queue.currentlyServing.joinedAt.toLocaleTimeString();
            } else {
                statusDiv.classList.add('hidden');
            }
            
            // Update admin queue list
            updateAdminQueueList(queue);
        }

        function updateQueueList(customers, elementId) {
            const listEl = document.getElementById(elementId);
            
            if (customers.length === 0) {
                listEl.innerHTML = '<p class="text-gray-500 text-center">No one in queue</p>';
            } else {
                listEl.innerHTML = customers.map((customer, index) => `
                    <div class="flex justify-between items-center py-2 px-3 ${index === 0 ? 'bg-yellow-100' : 'bg-white'} rounded-lg mb-2 slide-in">
                        <div>
                            <span class="font-medium">${customer.ticketNumber}</span>
                            <span class="text-sm text-gray-600 ml-2">${customer.joinedAt.toLocaleTimeString()}</span>
                        </div>
                        <div class="text-right">
                            <div class="text-sm text-gray-600">Position ${index + 1}</div>
                            <div class="text-xs text-orange-600">${(index + 1) * queueManager.queues.get(customer.service).averageServiceTime} min wait</div>
                        </div>
                    </div>
                `).join('');
            }
        }

        function updateAdminQueueList(queue) {
            const listEl = document.getElementById('adminQueueList');
            
            if (queue.customers.length === 0 && !queue.currentlyServing) {
                listEl.innerHTML = '<p class="text-gray-500 text-center py-8">No customers in queue</p>';
                return;
            }
            
            let html = '';
            
            // Currently serving
            if (queue.currentlyServing) {
                html += `
                    <div class="bg-green-100 border-l-4 border-green-500 p-4 rounded-lg mb-4 fade-in">
                        <div class="flex justify-between items-center">
                            <div class="flex-1">
                                <div class="flex items-center space-x-3 mb-2">
                                    <span class="font-semibold text-green-800 text-lg">🔄 Now Serving: ${queue.currentlyServing.ticketNumber}</span>
                                    <span class="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">In Service</span>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span class="font-medium text-green-700">👤 Name:</span>
                                        <span class="text-green-600 ml-1">${queue.currentlyServing.userName}</span>
                                    </div>
                                    <div>
                                        <span class="font-medium text-green-700">📧 Email:</span>
                                        <span class="text-green-600 ml-1">${queue.currentlyServing.userEmail}</span>
                                    </div>
                                    <div>
                                        <span class="font-medium text-green-700">📱 Phone:</span>
                                        <span class="text-green-600 ml-1">${queue.currentlyServing.userPhone || 'Not provided'}</span>
                                    </div>
                                    <div>
                                        <span class="font-medium text-green-700">🕐 Started:</span>
                                        <span class="text-green-600 ml-1">${queue.currentlyServing.joinedAt.toLocaleTimeString()}</span>
                                    </div>
                                    <div>
                                        <span class="font-medium text-green-700">⏱️ Duration:</span>
                                        <span class="text-green-600 ml-1">${Math.round((new Date() - queue.currentlyServing.joinedAt) / 60000)} min</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // Waiting customers
            html += queue.customers.map((customer, index) => `
                <div class="bg-white border rounded-lg p-4 mb-3 slide-in hover:shadow-md transition-shadow">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <div class="flex items-center space-x-3 mb-3">
                                <span class="font-bold text-lg text-gray-900">${customer.ticketNumber}</span>
                                <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                    Position ${index + 1}
                                </span>
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm mb-3">
                                <div class="flex items-center">
                                    <span class="font-medium text-gray-700">👤 Name:</span>
                                    <span class="text-gray-900 ml-2 font-medium">${customer.userName}</span>
                                </div>
                                <div class="flex items-center">
                                    <span class="font-medium text-gray-700">📧 Email:</span>
                                    <span class="text-gray-600 ml-2">${customer.userEmail}</span>
                                </div>
                                <div class="flex items-center">
                                    <span class="font-medium text-gray-700">📱 Phone:</span>
                                    <span class="text-gray-600 ml-2">${customer.userPhone || 'Not provided'}</span>
                                </div>
                                <div class="flex items-center">
                                    <span class="font-medium text-gray-700">🕐 Joined:</span>
                                    <span class="text-gray-600 ml-2">${customer.joinedAt.toLocaleTimeString()}</span>
                                </div>
                                <div class="flex items-center">
                                    <span class="font-medium text-gray-700">⏳ Waiting:</span>
                                    <span class="text-orange-600 ml-2 font-medium">${Math.round((new Date() - customer.joinedAt) / 60000)} min</span>
                                </div>
                            </div>
                            
                            <div class="flex items-center space-x-4 text-xs">
                                <span class="bg-orange-50 text-orange-700 px-2 py-1 rounded">
                                    Est. remaining: ${(index + 1) * queue.averageServiceTime} min
                                </span>
                                <span class="bg-gray-50 text-gray-600 px-2 py-1 rounded">
                                    User ID: ${customer.userId}
                                </span>
                            </div>
                        </div>
                        
                        <div class="flex flex-col space-y-2 ml-4">
                            <button onclick="callSpecificCustomer('${currentAdminService}', '${customer.id}')" 
                                    class="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm transition-colors font-medium">
                                📞 Call Now
                            </button>
                            <button onclick="removeCustomer('${currentAdminService}', '${customer.id}')" 
                                    class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm transition-colors">
                                🗑️ Remove
                            </button>
                            <button onclick="viewCustomerDetails('${customer.userId}')" 
                                    class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm transition-colors">
                                👁️ Details
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
            
            listEl.innerHTML = html;
        }

        // Admin Actions
        function updateServiceSettings() {
            const newServiceTime = parseInt(document.getElementById('serviceTimeInput').value);
            const queue = queueManager.queues.get(currentAdminService);
            queue.averageServiceTime = newServiceTime;
            queueManager.showNotification('Service time updated successfully!');
        }

        async function addTestCustomer() {
            // Create a test customer
            const testUser = {
                id: 'test_' + Date.now(),
                firstName: 'Test',
                lastName: 'Customer',
                email: `test${Date.now()}@example.com`
            };
            
            const originalUser = authManager.currentUser;
            authManager.currentUser = testUser;
            
            await queueManager.joinQueue(currentAdminService, testUser.id);
            
            authManager.currentUser = originalUser;
        }

        function exportQueueData() {
            const data = {
                queues: Object.fromEntries(queueManager.queues),
                users: authManager.sessions.size,
                timestamp: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `liveline-data-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            queueManager.showNotification('Queue data exported!');
        }

        function resetStatistics() {
            if (confirm('Are you sure you want to reset all statistics?')) {
                queueManager.queues.forEach(queue => {
                    queue.totalServed = 0;
                });
                queueManager.showNotification('Statistics reset successfully!');
                updateAdminDisplay();
            }
        }

        function toggleAutoRefresh() {
            queueManager.autoRefresh = !queueManager.autoRefresh;
            const toggle = document.getElementById('autoRefreshToggle');
            toggle.textContent = queueManager.autoRefresh ? 'ON' : 'OFF';
            toggle.className = queueManager.autoRefresh ? 
                'bg-green-500 text-white px-3 py-1 rounded-full text-sm' : 
                'bg-red-500 text-white px-3 py-1 rounded-full text-sm';
        }

        // Utility Functions
        function removeCustomer(service, customerId) {
            const queue = queueManager.queues.get(service);
            const customer = queue.customers.find(c => c.id === customerId);
            
            if (customer && customer.userId) {
                queueManager.leaveQueue(service, customer.userId);
            } else {
                queue.customers = queue.customers.filter(c => c.id !== customerId);
                queueManager.broadcastQueueUpdate();
            }
            
            queueManager.showNotification('Customer removed from queue');
        }

        // Call specific customer (skip queue)
        function callSpecificCustomer(service, customerId) {
            const queue = queueManager.queues.get(service);
            const customerIndex = queue.customers.findIndex(c => c.id === customerId);
            
            if (customerIndex !== -1) {
                const customer = queue.customers.splice(customerIndex, 1)[0];
                queue.currentlyServing = customer;
                queue.lastUpdated = new Date();
                
                // Update user ticket status
                if (customer.userId) {
                    queueManager.userTickets.delete(customer.userId);
                    
                    // Update user profile history
                    const userProfile = authManager.getUserProfile(customer.userId);
                    if (userProfile.ticketHistory) {
                        const historyItem = userProfile.ticketHistory.find(h => h.id === customer.id);
                        if (historyItem) {
                            historyItem.status = 'being_served';
                            historyItem.calledAt = new Date();
                        }
                    }
                    authManager.updateUserProfile(customer.userId, userProfile);
                }
                
                queueManager.saveQueuesToStorage();
                queueManager.broadcastQueueUpdate();
                queueManager.showNotification(`Now serving: ${customer.ticketNumber} (${customer.userName})`);
                
                // Simulate service completion
                setTimeout(() => {
                    queueManager.completeService(service, customer);
                }, queue.averageServiceTime * 1000);
            }
        }

        // View detailed customer information
        function viewCustomerDetails(userId) {
            const user = Array.from(authManager.users.values()).find(u => u.id === userId);
            const userProfile = authManager.getUserProfile(userId);
            
            if (!user) {
                queueManager.showNotification('Customer details not found');
                return;
            }
            
            const stats = userProfile.statistics;
            const recentTickets = userProfile.ticketHistory ? userProfile.ticketHistory.slice(-5) : [];
            
            const detailsHtml = `
                <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="closeCustomerDetails()">
                    <div class="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto" onclick="event.stopPropagation()">
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="text-2xl font-bold text-gray-900">Customer Details</h2>
                            <button onclick="closeCustomerDetails()" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div class="space-y-3">
                                <h3 class="text-lg font-semibold text-gray-800 border-b pb-2">Personal Information</h3>
                                <div class="space-y-2 text-sm">
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">👤 Full Name:</span>
                                        <span class="font-medium">${user.firstName} ${user.lastName}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">📧 Email:</span>
                                        <span class="font-medium">${user.email}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">📱 Phone:</span>
                                        <span class="font-medium">${user.phone || 'Not provided'}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">📅 Member Since:</span>
                                        <span class="font-medium">${new Date(user.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">🔐 Last Login:</span>
                                        <span class="font-medium">${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">🔢 Login Count:</span>
                                        <span class="font-medium">${user.loginCount || 0}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="space-y-3">
                                <h3 class="text-lg font-semibold text-gray-800 border-b pb-2">Queue Statistics</h3>
                                <div class="space-y-2 text-sm">
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">🎫 Total Tickets:</span>
                                        <span class="font-medium text-blue-600">${stats.totalTickets || 0}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">✅ Completed:</span>
                                        <span class="font-medium text-green-600">${stats.completedTickets || 0}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">❌ Cancelled:</span>
                                        <span class="font-medium text-red-600">${stats.cancelledTickets || 0}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">⏱️ Avg Wait:</span>
                                        <span class="font-medium text-orange-600">${stats.averageWaitTime || 0} min</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">❤️ Favorite Service:</span>
                                        <span class="font-medium text-purple-600">${stats.favoriteService || 'None'}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600">🕐 Total Wait Time:</span>
                                        <span class="font-medium">${stats.totalWaitTime || 0} min</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="space-y-3">
                            <h3 class="text-lg font-semibold text-gray-800 border-b pb-2">Recent Ticket History</h3>
                            <div class="space-y-2 max-h-32 overflow-y-auto">
                                ${recentTickets.length > 0 ? recentTickets.reverse().map(ticket => {
                                    const statusColors = {
                                        'active': 'bg-blue-100 text-blue-800',
                                        'being_served': 'bg-yellow-100 text-yellow-800',
                                        'completed': 'bg-green-100 text-green-800',
                                        'cancelled': 'bg-red-100 text-red-800'
                                    };
                                    return `
                                        <div class="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                                            <div>
                                                <span class="font-medium">${ticket.ticketNumber}</span>
                                                <span class="text-gray-600 ml-2">${ticket.service}</span>
                                                <span class="text-xs text-gray-500 ml-2">${new Date(ticket.joinedAt).toLocaleDateString()}</span>
                                            </div>
                                            <span class="px-2 py-1 rounded-full text-xs font-medium ${statusColors[ticket.status]}">
                                                ${ticket.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </div>
                                    `;
                                }).join('') : '<p class="text-gray-500 text-center py-4">No recent tickets</p>'}
                            </div>
                        </div>
                        
                        <div class="mt-6 flex justify-end space-x-3">
                            <button onclick="contactCustomer('${user.email}')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                                📧 Contact Customer
                            </button>
                            <button onclick="closeCustomerDetails()" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', detailsHtml);
        }

        // Close customer details modal
        function closeCustomerDetails() {
            const modal = document.querySelector('.fixed.inset-0.bg-black');
            if (modal) {
                modal.remove();
            }
        }

        // Contact customer (demo function)
        function contactCustomer(email) {
            queueManager.showNotification(`📧 Email client opened for ${email}`);
            // In real app: window.open(`mailto:${email}`)
            closeCustomerDetails();
        }

        function updateCurrentTime() {
            const timeEl = document.getElementById('currentTime');
            if (timeEl) {
                timeEl.textContent = new Date().toLocaleTimeString();
            }
        }

        // Add some demo data after initialization
        setTimeout(() => {
            if (authManager.currentUser && authManager.isAdmin()) {
                // Add demo customers to different queues for admin view
                const demoData = [
                    { service: 'bank', count: 2 },
                    { service: 'hospital', count: 1 },
                    { service: 'government', count: 3 }
                ];
                
                demoData.forEach(({ service, count }) => {
                    for (let i = 0; i < count; i++) {
                        setTimeout(() => {
                            addTestCustomer();
                            currentAdminService = service;
                        }, i * 500);
                    }
                });
            }
        }, 3000);