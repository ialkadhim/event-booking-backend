// Updated script.js content (see previous message for full implementation)

// Backend API calls
document.getElementById('login-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const lastName = document.getElementById('lastName').value.trim();
    const membershipNumber = document.getElementById('membershipNumber').value.trim();

    try {
        const user = await loginUser(lastName, membershipNumber);
        localStorage.setItem('user', JSON.stringify(user));

        document.getElementById('login-page').classList.add('hidden');
        document.getElementById('dashboard-page').classList.remove('hidden');

        populateUserProfile(user);
        const events = await fetchEvents(user.id);
        renderEvents(events, user);
    } catch {
        showToast('Invalid credentials. Please try again.', true);
    }
});

async function loginUser(lastName, membershipNumber) {
    const res = await fetch('https://event-booking-backend-production-25fe.up.railway.app/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastName, membershipNumber })
    });
    if (!res.ok) throw new Error('Login failed');
    return await res.json();
}

async function fetchEvents(userId) {
    const res = await fetch(`https://event-booking-backend-production-25fe.up.railway.app/api/events/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch events');
    return await res.json();
}

function populateUserProfile(user) {
    document.getElementById('user-name').textContent = user.full_name;
    document.getElementById('profile-name').textContent = user.full_name;
    document.getElementById('profile-membership').textContent = user.membership_number;
    document.getElementById('profile-gender').textContent = user.gender;
    document.getElementById('profile-level').textContent = user.tennis_competency_level;
    document.getElementById('profile-status').textContent = user.status;
}

async function renderEvents(events, user) {
    const container = document.getElementById('all-events-container');
    container.innerHTML = '';

    for (const event of events) {
        const isEligible = event.level_required === 'All Levels' || event.level_required === user.tennis_competency_level;
        const eligibleClass = isEligible ? '' : 'opacity-50 pointer-events-none';
        const filledPercent = Math.min((event.spots_filled / event.capacity) * 100, 100);

        container.innerHTML += `
            <div class="event-card p-6 ${eligibleClass}" data-event-id="${event.id}">
                <div class="flex flex-col md:flex-row md:justify-between md:items-center">
                    <div class="mb-4 md:mb-0">
                        <h4 class="text-lg font-medium text-gray-900">${event.title}</h4>
                        <div class="mt-1 text-sm text-gray-500">${event.start_time} - ${event.end_time} • ${event.level_required}</div>
                        <div class="mt-2 flex items-center">
                            <span class="text-xs font-medium text-gray-500">${event.spots_filled}/${event.capacity} spots filled</span>
                            <div class="ml-2 w-24 bg-gray-200 rounded-full h-2">
                                <div class="bg-green-500 h-2 rounded-full" style="width: ${filledPercent}%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="event-actions" data-status="${event.user_status || 'none'}">
                        ${renderEventActionButton(event, user)}
                    </div>
                </div>
            </div>`;
    }
}

function renderEventActionButton(event, user) {
    const userStatus = event.user_status;
    const isEligible = event.level_required === 'All Levels' || event.level_required === user.tennis_competency_level;

    if (!isEligible) {
        return `<div class="text-xs text-gray-500 italic">Not eligible - ${event.level_required} required</div>`;
    }

    if (userStatus === 'confirmed') {
        return `
            <div class="flex items-center text-sm text-green-600 font-medium mr-2">
                ✔ Confirmed
            </div>
            <button onclick="updateRegistration(${user.id}, ${event.id}, 'withdrawn')" class="btn-withdraw btn-action px-3 py-1.5 rounded-md text-white text-sm font-medium shadow-sm">
                Withdraw
            </button>`;
    } else if (userStatus === 'waitlist') {
        return `
            <div class="flex items-center text-sm text-yellow-600 font-medium mr-2">
                ⏳ On Waitlist
            </div>
            <button onclick="updateRegistration(${user.id}, ${event.id}, 'withdrawn')" class="btn-withdraw btn-action px-3 py-1.5 rounded-md text-white text-sm font-medium shadow-sm">
                Withdraw
            </button>`;
    } else {
        const status = event.spots_filled >= event.capacity ? 'waitlist' : 'confirmed';
        const label = status === 'confirmed' ? 'Confirm Spot' : 'Join Waitlist';
        const btnClass = status === 'confirmed' ? 'btn-confirm' : 'btn-waitlist';

        return `<button onclick="updateRegistration(${user.id}, ${event.id}, '${status}')" class="${btnClass} btn-action px-3 py-1.5 rounded-md text-white text-sm font-medium shadow-sm">
            ${label}
        </button>`;
    }
}

async function updateRegistration(userId, eventId, status) {
    try {
        await fetch('https://event-booking-backend-production-25fe.up.railway.app/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, eventId, status })
        });

        const allCards = document.querySelectorAll(`.event-card[data-event-id="${eventId}"]`);
        allCards.forEach(card => {
            const eventActions = card.querySelector('.event-actions');
            eventActions.setAttribute('data-status', status);

            const event = {
                id: eventId,
                title: card.querySelector('h4').innerText,
                level_required: card.querySelector('.text-sm.text-gray-500').innerText.split('•').pop().trim(),
                spots_filled: parseInt(card.querySelector('.text-xs.font-medium.text-gray-500').innerText.split('/')[0]),
                capacity: parseInt(card.querySelector('.text-xs.font-medium.text-gray-500').innerText.split('/')[1]),
                user_status: status
            };

            const user = JSON.parse(localStorage.getItem('user'));
            eventActions.innerHTML = renderEventActionButton(event, user);
        });

        showToast(`You are now ${status === 'withdrawn' ? 'withdrawn from' : status === 'waitlist' ? 'waitlisted for' : 'confirmed for'} the event.`);
    } catch (err) {
        console.error('Registration update failed', err);
        showToast('Something went wrong.', true);
    }
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    toastMessage.textContent = message;
    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add(isError ? 'bg-red-500' : 'bg-green-500');

    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

