 // Global state
        let currentView = 'user';
        let selectedService = null;
        let userToken = null;
        let isInQueue = false;
        let currentAdminService = 'hospital';
        
        // Mock data for different services
        const serviceData = {
            hospital: {
                name: 'Hospital - General Consultation',
                currentServing: 'H015',
                queue: ['H016', 'H017', 'H018', 'H019', 'H020'],
                nextToken: 21,
                avgWaitTime: 8
            },
            bank: {
                name: 'Bank - Customer Service',
                currentServing: 'B032',
                queue: ['B033', 'B034', 'B035'],
                nextToken: 36,
                avgWaitTime: 5
            },
            government: {
                name: 'Government - Document Services',
                currentServing: 'G008',
                queue: ['G009', 'G010', 'G011', 'G012', 'G013', 'G014'],
                nextToken: 15,
                avgWaitTime: 12
            }
        };

        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            updateDisplay();
            // Simulate real-time updates
            setInterval(simulateRealTimeUpdates, 3000);
        });

        function selectService(service) {
            selectedService = service;
            document.querySelectorAll('.service-btn').forEach(btn => {
                btn.classList.remove('border-blue-500', 'bg-blue-50');
                btn.classList.add('border-gray-200');
            });
            event.target.closest('.service-btn').classList.add('border-blue-500', 'bg-blue-50');
            
            document.getElementById('queueStatus').classList.remove('hidden');
            document.getElementById('liveQueue').classList.remove('hidden');
            updateQueueDisplay();
            showNotification(`Selected ${serviceData[service].name}`);
        }

        function joinQueue() {
            if (!selectedService || isInQueue) return;
            
            const service = serviceData[selectedService];
            const tokenPrefix = selectedService.charAt(0).toUpperCase();
            userToken = `${tokenPrefix}${String(service.nextToken).padStart(3, '0')}`;
            service.queue.push(userToken);
            service.nextToken++;
            isInQueue = true;
            
            document.getElementById('joinQueueBtn').classList.add('hidden');
            document.getElementById('leaveQueueBtn').classList.remove('hidden');
            
            updateQueueDisplay();
            showNotification(`Joined queue! Your token: ${userToken}`);
        }

        function leaveQueue() {
            if (!isInQueue || !userToken) return;
            
            const service = serviceData[selectedService];
            const index = service.queue.indexOf(userToken);
            if (index > -1) {
                service.queue.splice(index, 1);
            }
            
            isInQueue = false;
            userToken = null;
            
            document.getElementById('joinQueueBtn').classList.remove('hidden');
            document.getElementById('leaveQueueBtn').classList.add('hidden');
            
            updateQueueDisplay();
            showNotification('Left the queue');
        }

        function updateQueueDisplay() {
            if (!selectedService) return;
            
            const service = serviceData[selectedService];
            
            // Update user token display
            document.getElementById('userToken').textContent = userToken || '-';
            document.getElementById('userStatus').textContent = userToken ? 
                (userToken === service.currentServing ? 'Your turn!' : 'In queue') : 
                'Join queue to get token';
            
            // Update queue info
            document.getElementById('currentServing').textContent = service.currentServing;
            
            const peopleAhead = userToken ? service.queue.indexOf(userToken) : 0;
            document.getElementById('peopleAhead').textContent = peopleAhead >= 0 ? peopleAhead : '-';
            
            const estimatedWait = peopleAhead > 0 ? `${peopleAhead * service.avgWaitTime} min` : 
                                 userToken === service.currentServing ? 'Your turn!' : '-';
            document.getElementById('estimatedWait').textContent = estimatedWait;
            
            // Update live queue
            const queueList = document.getElementById('queueList');
            queueList.innerHTML = '';
            
            // Add currently serving
            const currentDiv = document.createElement('div');
            currentDiv.className = 'flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg';
            currentDiv.innerHTML = `
                <span class="font-medium text-green-800">${service.currentServing}</span>
                <span class="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">Currently Serving</span>
            `;
            queueList.appendChild(currentDiv);
            
            // Add queue items
            service.queue.forEach((token, index) => {
                const div = document.createElement('div');
                div.className = `flex items-center justify-between p-3 rounded-lg slide-in ${
                    token === userToken ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                }`;
                div.innerHTML = `
                    <span class="font-medium ${token === userToken ? 'text-blue-800' : 'text-gray-800'}">${token}</span>
                    <span class="text-sm text-gray-500">Position ${index + 1}</span>
                `;
                queueList.appendChild(div);
            });
        }

        function toggleView() {
            currentView = currentView === 'user' ? 'admin' : 'user';
            document.getElementById('userView').classList.toggle('hidden');
            document.getElementById('adminView').classList.toggle('hidden');
            document.getElementById('toggleView').textContent = 
                currentView === 'user' ? 'Switch to Admin' : 'Switch to User';
            
            if (currentView === 'admin') {
                updateAdminDisplay();
            }
        }

        function updateAdminDisplay() {
            const service = serviceData[currentAdminService];
            
            document.getElementById('totalInQueue').textContent = service.queue.length;
            document.getElementById('currentlyServing').textContent = service.currentServing;
            document.getElementById('avgWaitTime').textContent = service.avgWaitTime;
            
            // Update admin queue list
            const adminQueueList = document.getElementById('adminQueueList');
            adminQueueList.innerHTML = '';
            
            // Currently serving
            const currentDiv = document.createElement('div');
            currentDiv.className = 'flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg';
            currentDiv.innerHTML = `
                <div>
                    <span class="font-medium text-green-800">${service.currentServing}</span>
                    <span class="text-sm text-green-600 ml-2">Currently Serving</span>
                </div>
                <button onclick="markCompleted()" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">
                    Complete
                </button>
            `;
            adminQueueList.appendChild(currentDiv);
            
            // Queue items
            service.queue.forEach((token, index) => {
                const div = document.createElement('div');
                div.className = 'flex items-center justify-between p-4 bg-gray-50 rounded-lg';
                div.innerHTML = `
                    <div>
                        <span class="font-medium text-gray-800">${token}</span>
                        <span class="text-sm text-gray-500 ml-2">Position ${index + 1}</span>
                    </div>
                    <div class="space-x-2">
                        <button onclick="callSpecific('${token}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">
                            Call Now
                        </button>
                        <button onclick="removeFromQueue('${token}')" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm">
                            Remove
                        </button>
                    </div>
                `;
                adminQueueList.appendChild(div);
            });
        }

        function callNext() {
            const service = serviceData[currentAdminService];
            if (service.queue.length === 0) {
                showNotification('No one in queue');
                return;
            }
            
            service.currentServing = service.queue.shift();
            updateAdminDisplay();
            updateDisplay();
            showNotification(`Called ${service.currentServing}`);
            
            // Simulate notification to user
            if (userToken === service.currentServing) {
                setTimeout(() => {
                    showNotification('Your turn! Please proceed to the counter.');
                }, 1000);
            }
        }

        function markCompleted() {
            const service = serviceData[currentAdminService];
            showNotification(`${service.currentServing} marked as completed`);
            document.getElementById('servedToday').textContent = 
                parseInt(document.getElementById('servedToday').textContent) + 1;
        }

        function callSpecific(token) {
            const service = serviceData[currentAdminService];
            const index = service.queue.indexOf(token);
            if (index > -1) {
                service.queue.splice(index, 1);
                service.currentServing = token;
                updateAdminDisplay();
                updateDisplay();
                showNotification(`Called ${token}`);
            }
        }

        function removeFromQueue(token) {
            const service = serviceData[currentAdminService];
            const index = service.queue.indexOf(token);
            if (index > -1) {
                service.queue.splice(index, 1);
                updateAdminDisplay();
                updateDisplay();
                showNotification(`Removed ${token} from queue`);
            }
        }

        function switchAdminService() {
            currentAdminService = document.getElementById('adminService').value;
            updateAdminDisplay();
        }

        function pauseQueue() {
            const btn = document.getElementById('pauseBtn');
            if (btn.textContent === 'Pause Queue') {
                btn.textContent = 'Resume Queue';
                btn.className = 'bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-medium transition-colors';
                showNotification('Queue paused');
            } else {
                btn.textContent = 'Pause Queue';
                btn.className = 'bg-yellow-600 hover:bg-yellow-700 text-white py-3 px-6 rounded-lg font-medium transition-colors';
                showNotification('Queue resumed');
            }
        }

        function simulateRealTimeUpdates() {
            // Randomly add new people to queues
            Object.keys(serviceData).forEach(service => {
                if (Math.random() < 0.3) { // 30% chance
                    const data = serviceData[service];
                    const prefix = service.charAt(0).toUpperCase();
                    const newToken = `${prefix}${String(data.nextToken).padStart(3, '0')}`;
                    data.queue.push(newToken);
                    data.nextToken++;
                }
            });
            
            updateDisplay();
            if (currentView === 'admin') {
                updateAdminDisplay();
            }
        }

        function updateDisplay() {
            if (selectedService) {
                updateQueueDisplay();
            }
        }

        function showNotification(message) {
            const notification = document.getElementById('notification');
            const text = document.getElementById('notificationText');
            text.textContent = message;
            notification.classList.remove('hidden');
            
            setTimeout(() => {
                notification.classList.add('hidden');
            }, 3000);
        }

        // Event listeners
        document.getElementById('toggleView').addEventListener('click', toggleView);