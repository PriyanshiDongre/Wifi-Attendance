

// Function to validate email format
const isValidEmail = (email) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
};

// Function to register a new user
const registerUser = (email, password) => {
    if (!isValidEmail(email)) {
        console.error('Invalid email format.');
        return;
    }

    firebase.auth().fetchSignInMethodsForEmail(email)
        .then((signInMethods) => {
            if (signInMethods.length > 0) {
                console.error('Email is already registered.');
                return;
            }

            firebase.auth().createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    console.log('User registered:', userCredential.user);
                })
                .catch((error) => {
                    console.error('Error registering user:', error);
                });
        })
        .catch((error) => {
            console.error('Error checking email registration:', error);
        });
};

// Function to log in a user
const loginUser = (email, password) => {
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('User logged in:', userCredential.user);
        })
        .catch((error) => {
            console.error('Error logging in user:', error);
        });
};

// ✅ New function to fetch attendance records for logged-in users
const getAttendanceRecords = async () => {
    const user = auth.currentUser;
    if (!user) {
        console.error("No authenticated user found.");
        return [];
    }

    try {
       // Fetch user's MAC address from Firestore using their UID
       const userDoc = await db.collection("users").doc(user.uid).get();

       if (!userDoc.exists) {
           console.error("User not found in database.");
           return [];
       }

       const userData = userDoc.data();
       const macAddress = userData.macAddress; // Ensure 'macAddress' exists in Firestore

       if (!macAddress) {
           console.error("MAC address not found for this user.");
           return [];
       }

       // Fetch attendance records based on MAC address
       const attendanceRef = db.collection("attendance").where("macAddress", "==", macAddress);
       const attendanceSnapshot = await attendanceRef.get();

       let records = [];
       attendanceSnapshot.forEach((doc) => {
           records.push(doc.data());
       });

       return records;
   } catch (error) {
       console.error("Error fetching attendance records:", error);
       return [];
    }
};

const getStudentAttendance = async () => {
    const user = auth.currentUser;
    if (!user) {
        console.error("No authenticated user found.");
        return [];
    }

    try {
        const response = await fetch('/get-student-attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ uid: user.uid })
        });

        if (!response.ok) {
            throw new Error('Failed to fetch attendance records');
        }

        const attendanceRecords = await response.json();
        return attendanceRecords;
    } catch (error) {
        console.error("Error fetching student attendance:", error);
        return [];
    }
};

// Export all functions

export { registerUser, loginUser, getAttendanceRecords };
