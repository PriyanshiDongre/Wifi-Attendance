

// ✅ Step 1: Check Attendance & Add to Partial Collection
app.post('/check-attendance', async (req, res) => {
    const { macAddress, rssiValue } = req.body;

    try {
        // 🔹 Normalize MAC format
        const formattedMac = macAddress.toLowerCase().replace(/-/g, ":");
        console.log("Checking MAC address:", formattedMac);

        // 🔹 Verify if the student is registered
        const studentQuery = await db.collection("students").where("macAddress", "==", formattedMac).get();
        if (studentQuery.empty) {
            return res.status(404).send("MAC address not found.");
        }

        const studentDoc = studentQuery.docs[0];
        const studentData = studentDoc.data();
        const studentEmail = studentData.email; // Extract email from student data

        if (!studentEmail) {
            return res.status(500).send("Student email not found in database.");
        }

        // 🔹 Get expected RSSI range
        const configDoc = await db.collection('config').doc('rssiRange').get();
        if (!configDoc.exists) {
            return res.status(500).send("RSSI range configuration not found.");
        }

        const { min, max } = configDoc.data();

        // 🔹 Verify if RSSI is within range
        if (rssiValue >= min && rssiValue <= max) {
            // 🔹 Store student's information in "partial" collection, document name = email
            await db.collection("partial").doc(studentEmail).set({
                email: studentEmail,
                macAddress: formattedMac,
                rssiValue: rssiValue,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`✅ Partial attendance recorded for ${studentEmail} (RSSI: ${rssiValue})`);
            return res.json({ success: true, message: "Partial attendance recorded", email: studentEmail });
        } else {
            return res.status(400).send("RSSI value out of range.");
        }
    } catch (error) {
        console.error("Error checking attendance:", error);
        return res.status(500).send("Internal server error.");
    }
});

const generateTemporaryCode = async () => {
    try {
        const randomCode = Math.random().toString(36).substring(2, 10); // Generate a random alphanumeric code
        const expiresAt = admin.firestore.Timestamp.now().toMillis() + 3600000; // 1 hour from now

        await db.collection('temporaryCodes').doc('currentCode').set({
            code: randomCode,
            expiresAt: expiresAt
        });

        console.log(`✅ New temporary code generated: ${randomCode}, expires at: ${new Date(expiresAt)}`);
    } catch (error) {
        console.error("❌ Error generating temporary code:", error);
    }
};

// 🔹 Generate a code immediately when the server starts
generateTemporaryCode();

// 🔹 Continue generating new codes every hour
setInterval(generateTemporaryCode, 3600000);


// ✅ Step 2: Verify Attendance & Move from Partial to Attendance Collection
app.post('/verify-attendance', async (req, res) => {
    const { enteredCode, email } = req.body;

    try {
        // 🔹 Validate the Temporary Code
        const codeDoc = await db.collection('temporaryCodes').doc('currentCode').get();
        if (!codeDoc.exists) return res.status(500).send("Temporary code not found.");

        const { code, expiresAt } = codeDoc.data();
        const currentTime = admin.firestore.Timestamp.now().toMillis();

        if (currentTime > expiresAt) return res.status(400).send("Temporary code has expired.");
        if (enteredCode !== code) return res.status(400).send("Invalid temporary code.");

        // 🔹 Check if the student is in Partial Collection
        const partialEmailDoc = await db.collection("partial").doc(email).get();
        if (!partialEmailDoc.exists) return res.status(400).send("Student not found in partial list.");

        // 🔹 Get Current Date
        const today = new Date();
        const formattedDate = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;

        // 🔹 Move Attendance Data to Attendance Collection
        const attendanceRef = db.collection("attendance").doc(email);
        // Store attendance in history array without timestamp inside the array
await attendanceRef.set({
    email: email,
    history: admin.firestore.FieldValue.arrayUnion({
        date: formattedDate,
        status: "Present"
    }),
    timestamp: admin.firestore.FieldValue.serverTimestamp()  // Store timestamp at the document level
}, { merge: true });


        // 🔹 Remove the Student from Partial Collection
        await db.collection("partial").doc(email).delete();

        return res.json({ success: true, message: `Attendance marked for ${email} on ${formattedDate}` });

    } catch (error) {
        console.error("Error verifying attendance:", error);
        return res.status(500).send("Internal server error.");
    }
});



// ✅ Step 3: Get Attendance for a Specific Day
app.post('/get-attendance', async (req, res) => {
    const { email } = req.body;  // Only email is needed, no date input

    try {
        const studentDoc = await db.collection("attendance").doc(email).get();

        if (!studentDoc.exists) {
            return res.status(404).send("No attendance record found for this student.");
        }

        const data = studentDoc.data();
        const history = data.history || [];  // Get the stored history array

        return res.json({ email, history });  // Return full attendance history for the student
    } catch (error) {
        console.error("Error retrieving attendance:", error);
        return res.status(500).send("Internal server error.");
    }
});


// ✅ New Endpoint: Get Student Attendance
app.post('/get-student-attendance', async (req, res) => {
    const { uid } = req.body;

    try {
        const attendanceRef = db.collection("attendance");
        const snapshot = await attendanceRef.get();
        const attendanceRecords = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data[uid]) {
                attendanceRecords.push({ date: doc.id, status: "Present" });
            } else {
                attendanceRecords.push({ date: doc.id, status: "Absent" });
            }
        });

        return res.json(attendanceRecords);
    } catch (error) {
        console.error("Error fetching student attendance:", error);
        return res.status(500).send("Internal server error.");
    }
});


app.get('/get-registered-macs', async (req, res) => {
    try {
        const studentsCollection = db.collection('students');  // Adjust collection name if needed
        const snapshot = await studentsCollection.get();
        
        let macAddresses = [];
        snapshot.forEach(doc => {
            if (doc.data().macAddress) {
                macAddresses.push(doc.data().macAddress);
            }
        });

        res.json({ macAddress: macAddresses });
    } catch (error) {
        console.error("Error fetching registered MACs:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});



// ✅ Start the Express Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
