
// Function to retrieve attendance records in real-time
const getAttendanceRecords = () => {
    db.collection('Attendance').onSnapshot(snapshot => {
        const attendanceList = document.getElementById('attendance-list');
        attendanceList.innerHTML = ''; // Clear the list before updating

        snapshot.forEach(doc => {
            const data = doc.data();
            const listItem = document.createElement('li');
            listItem.textContent = `Attendance: ${data.name}, MAC: ${data.macAddress}, Time: ${data.timestamp.toDate().toLocaleString()}`;
            attendanceList.appendChild(listItem);
        });
    }, error => {
        console.error('Error retrieving attendance records:', error);
    });
};

// Call the function to start listening for attendance records
getAttendanceRecords();
