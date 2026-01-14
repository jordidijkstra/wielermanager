const admin = require("firebase-admin");
const fs = require("fs");

const serviceAccount = JSON.parse(
  fs.readFileSync("./serviceAccountKey.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = admin.firestore();

async function exportRaces() {
  const snapshot = await db.collection("races").get();
  const data = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  fs.writeFileSync("races.json", JSON.stringify(data, null, 2));
  console.log(`✔ ${data.length} races geëxporteerd`);
}

exportRaces().catch(console.error);
