

// Real-time attendance monitoring
const attendanceList = document.getElementById('attendance-list');
db.collection('attendance')
    .orderBy('timestamp', 'desc')
    .onSnapshot((snapshot) => {
        attendanceList.innerHTML = ''; // Clear existing list
        snapshot.forEach(doc => {
            const data = doc.data();
            const listItem = document.createElement('li');
            listItem.className = 'attendance-item';
            listItem.innerHTML = `
                <span class="mac">${data.macAddress}</span>
                <span class="time">${new Date(data.timestamp?.toDate()).toLocaleString()}</span>
                <span class="rssi">RSSI: ${data.rssiValue}</span>
            `;
            attendanceList.appendChild(listItem);
        });
    });


// Function to submit registration
// Add attendance list container to HTML if it doesn't exist
if (!document.getElementById('attendance-list')) {
    const container = document.createElement('div');
    container.id = 'attendance-container';
    container.innerHTML = `
        <h3>Real-time Attendance</h3>
        <ul id="attendance-list"></ul>
    `;
    document.body.appendChild(container);
}

document.getElementById('register').addEventListener('click', function() {

    const name = document.getElementById('name').value;
    const semester = document.getElementById('semester').value;
    const section = document.getElementById('section').value;
    const rollNumber = document.getElementById('roll-number').value;
    const macAddress = document.getElementById('mac-address').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Register user with email and password
    firebase.auth().createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
        // User registered successfully
        const user = userCredential.user;

        // Store additional student data in Firestore
        const db = firebase.firestore();
        db.collection("students").add({
            name: name,
            semester: semester,
            section: section,
            rollNumber: rollNumber,
            macAddress: macAddress,
            uid: user.uid // Store the user's UID for reference
        })
        .then(() => {
            alert("Registration successful.");
            // Clear input fields
            document.getElementById('name').value = '';
            document.getElementById('semester').value = '';
            document.getElementById('section').value = '';
            document.getElementById('roll-number').value = '';
            document.getElementById('mac-address').value = '';
            document.getElementById('email').value = '';
            document.getElementById('password').value = '';
        })
        .catch((error) => {
            console.error("Error storing student data: ", error);
        });
    })
    .catch((error) => {
        console.error("Error registering user: ", error);
    });
});
