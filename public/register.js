document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const authMsg = document.getElementById('auth-msg');

        try {
            const response = await fetch('https://expense-tracker-omega-neon-97.vercel.app/api/register', { // Updated URL
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                authMsg.textContent = `Error: ${data}`;
                authMsg.style.color = 'red';
            } else {
                authMsg.textContent = 'Registration successful! You can now log in.';
                authMsg.style.color = 'green';
                form.reset(); // Optional: Reset the form after successful registration
            }
        } catch (err) {
            authMsg.textContent = `Error: ${err}`;
            authMsg.style.color = 'red';
        }
    });
});
