// Set today's date dynamically
const today = new Date();
const options = { year: 'numeric', month: 'long', day: 'numeric' };
document.getElementById('date-heading').textContent = today.toLocaleDateString(undefined, options) + " entry";

// Handle submit
const form = document.getElementById('journal-form');
const textarea = form.querySelector('textarea');

// Assume email is saved in localStorage after login/signup
const userEmail = localStorage.getItem('user_email');

//Insert journal entry in Mongo DB
document.addEventListener("DOMContentLoaded", function () {
    const dateHeading = document.getElementById("date-heading");
    const submitBtn = document.getElementById("submit-btn");
    const journalInput = document.getElementById("journal-entry");
    const successMsg = document.getElementById("success-message");
    const analysing = document.getElementById("analysing-message");
    const emptyMsg = document.getElementById("empty-message");

    // Set date on screen
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = today.toLocaleDateString(undefined, options);
    dateHeading.textContent = formattedDate + " entry";

    // Submit handler
    submitBtn.addEventListener("click", function (e) {
        e.preventDefault();

        const entry = journalInput.value.trim();

        if (entry === "") {
            emptyMsg.classList.add("show");
            setTimeout(() => {
                emptyMsg.classList.remove("show");
            }, 3000);
            return;
        }

        analysing.classList.add("show");

        fetch("http://localhost:5000/submit_journal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                entry: entry,
                date: formattedDate,
                email: userEmail
            })
        })
        .then(res => res.json())
        .then(data => {
            analysing.classList.remove("show");
            successMsg.classList.add("show");
            journalInput.value = "";
            setTimeout(() => {
                successMsg.classList.remove("show");
            }, 3000);
        })
        .catch(err => {
            analysing.classList.remove("show");
            console.error("Error submitting journal:", err);
        });
    });
});
