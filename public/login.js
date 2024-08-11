document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const authMsg = document.getElementById('auth-msg');

        try {
            const response = await fetch('https://expense-tracker-omega-neon-97.vercel.app/api/login', { // Updated URL
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.userId) {
                localStorage.setItem('userId', data.userId);
                window.location.href = '/index.html'; // Redirect to the homepage after login
            } else {
                authMsg.textContent = `Login failed: ${data}`;
                authMsg.style.color = 'red';
            }
        } catch (err) {
            authMsg.textContent = `Error: ${err}`;
            authMsg.style.color = 'red';
        }
    });
});
