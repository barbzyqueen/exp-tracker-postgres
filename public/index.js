document.addEventListener('DOMContentLoaded', () => {
    
    fetch('https://expense-tracker-omega-neon-97.vercel.app/api/current-user') // Updated URL
        .then(response => {
            if (!response.ok) {
                throw new Error('Not authenticated');
            }
            return response.json();
        })
        .then(data => {
            document.getElementById('username').textContent = data.username;
        })
        .catch(error => {
            console.error('Error fetching user info:', error);
            window.location.href = '/login.html'; // Redirect to login page if not authenticated
        });

    // Function to check if the user is logged in
    async function checkLogin() {
        try {
            const response = await fetch('https://expense-tracker-omega-neon-97.vercel.app/api/check-session', { // Updated URL
                method: 'GET',
                credentials: 'include' // Important: send cookies with the request
            });

            if (!response.ok) {
                throw new Error('Not authenticated');
            }
        } catch (err) {
            window.location.href = '/login.html'; // Redirect to login page if not authenticated
        }
    }

    // Check if user is logged in when the page loads
    checkLogin();

    // Handle the transaction form submission
    const transactionForm = document.getElementById('transactionForm');
    if (transactionForm) {
        transactionForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const type = document.getElementById('type').checked ? 'income' : 'expense';
            const category = document.getElementById('category').value;
            const amount = document.getElementById('amount').value;
            const date = document.getElementById('date').value;
            const statusDiv = document.getElementById('status');

            try {
                const response = await fetch('https://expense-tracker-omega-neon-97.vercel.app/api/expenses', { // Updated URL
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include', // Important: send cookies with the request
                    body: JSON.stringify({ type, category, amount, date })
                });

                const data = await response.json();

                if (!response.ok) {
                    statusDiv.textContent = data;
                } else {
                    statusDiv.textContent = "Transaction added successfully";
                    statusDiv.style.color = 'green';
                    transactionForm.reset();
                    loadTransactions(); // Refresh the transactions list
                }
            } catch (err) {
                statusDiv.textContent = `Error: ${err.message}`;
                statusDiv.style.color = 'red';
            }
        });
    }

    // Handle the edit expense form submission
    const editExpenseForm = document.getElementById('editExpenseForm');
    if (editExpenseForm) {
        editExpenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const expenseId = document.getElementById('editExpenseId').value;
            const category = document.getElementById('editCategory').value;
            const amount = document.getElementById('editAmount').value;
            const date = document.getElementById('editDate').value;
            const statusDiv = document.getElementById('status');

            try {
                const response = await fetch(`https://expense-tracker-omega-neon-97.vercel.app/api/expenses/${expenseId}`, { // Updated URL
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include', // Important: send cookies with the request
                    body: JSON.stringify({ category, amount, date })
                });

                const data = await response.json();

                if (!response.ok) {
                    statusDiv.textContent = data;
                } else {
                    statusDiv.textContent = "Expense updated successfully";
                    statusDiv.style.color = 'green';
                    editExpenseForm.reset();
                    document.getElementById('editExpenseFormContainer').style.display = 'none';
                    loadTransactions(); // Refresh the transactions list
                }
            } catch (err) {
                statusDiv.textContent = `Error: ${err.message}`;
                statusDiv.style.color = 'red';
            }
        });
    }

    // Handle expense deletion
    async function deleteTransaction(expenseId) {
        const statusDiv = document.getElementById('status');

        try {
            const response = await fetch(`https://expense-tracker-omega-neon-97.vercel.app/api/expenses/${expenseId}`, { // Updated URL
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include' // Important: send cookies with the request
            });

            const data = await response.json();

            if (!response.ok) {
                statusDiv.textContent = data;
            } else {
                statusDiv.textContent = "Transaction deleted successfully";
                statusDiv.style.color = 'green';
                loadTransactions(); // Refresh the transactions list
            }
        } catch (err) {
            statusDiv.textContent = `Error: ${err.message}`;
            statusDiv.style.color = 'red';
        }
    }

    // Function to fetch and display transactions
    async function loadTransactions() {
        const transactionList = document.getElementById('transactionList');
        const statusDiv = document.getElementById('status');

        try {
            const response = await fetch('https://expense-tracker-omega-neon-97.vercel.app/api/expenses', { // Updated URL
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include' // Important: send cookies with the request
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data);
            }

            transactionList.innerHTML = '';

            data.forEach(expense => {
                const listItem = document.createElement('li');
                listItem.textContent = `${expense.category}: $${expense.amount} on ${expense.date}`;

                // Add edit button
                const editButton = document.createElement('button');
                editButton.textContent = 'Edit';
                editButton.onclick = () => showEditForm(expense);
                listItem.appendChild(editButton);

                // Add delete button
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.onclick = () => deleteTransaction(expense.id);
                listItem.appendChild(deleteButton);

                transactionList.appendChild(listItem);
            });

        } catch (err) {
            statusDiv.textContent = `Error: ${err.message}`;
            statusDiv.style.color = 'red';
        }
    }

    // Function to show the edit form with existing expense data
    function showEditForm(expense) {
        document.getElementById('editExpenseId').value = expense.id;
        document.getElementById('editCategory').value = expense.category;
        document.getElementById('editAmount').value = expense.amount;
        document.getElementById('editDate').value = expense.date;
        document.getElementById('editExpenseFormContainer').style.display = 'block';
    }

    // Load transactions when the page loads
    loadTransactions();

    // Event listener for logout button
    document.getElementById('logout-btn').addEventListener('click', async () => {
        try {
            const response = await fetch('https://expense-tracker-omega-neon-97.vercel.app/api/logout', { // Updated URL
                method: 'POST',
                credentials: 'include' // Important to send cookies with the request
            });

            if (response.ok) {
                window.location.href = 'login.html'; // Redirect to login page after logout
            } else {
                console.error('Logout failed');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });
});
