import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

const downloadRidersCSV = async () => {
    try {
      const ridersSnapshot = await getDocs(collection(db, 'riders'));
      const ridersData = ridersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // CSV headers
      const headers = ['ID', 'Voornaam', 'Achternaam', 'Team ID', 'Prijs'];
      const csvRows = [headers.join(';')]; // Gebruik ; voor Nederlandse Excel
      
      // CSV data rows - sorteer op ID
      ridersData
        .sort((a, b) => a.id - b.id)
        .forEach(rider => {
          const row = [
            rider.id || '',
            rider.firstname || '',
            rider.lastname || '',
            rider.teamId || '',
            rider.price || ''
          ];
          csvRows.push(row.join(';'));
        });
      
      // UTF-8 BOM toevoegen voor correcte weergave in Excel
      const BOM = '\uFEFF';
      const csvString = BOM + csvRows.join('\n');
      
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `riders-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert(`✓ ${ridersData.length} renners geëxporteerd naar CSV!`);
    } catch (err) {
      console.error('Download fout:', err);
      alert('✗ Download mislukt: ' + err.message);
    }
  };

  const uploadRidersCSV = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      
      // Verwijder BOM en trim
      const cleanText = text.replace(/^\uFEFF/, '').trim();
      const rows = cleanText.split('\n');
      
      // Skip header row (eerste rij)
      const dataRows = rows.slice(1);
      
      let updatedCount = 0;
      let errors = [];
      
      for (const row of dataRows) {
        const trimmedRow = row.trim();
        if (!trimmedRow) continue; // Skip lege rijen
        
        // Split en clean alle values
        const columns = trimmedRow.split(';').map(col => col.trim().replace(/"/g, ''));
        const [id, firstname, lastname, teamId, price] = columns;
        
        // Validatie
        if (!id || !price || isNaN(id) || isNaN(price)) {
          errors.push(`Ongeldige rij: ${trimmedRow.substring(0, 50)}`);
          continue;
        }
        
        try {
          // Update rider in Firestore - gebruik string ID
          const riderRef = doc(db, 'riders', id);
          await setDoc(riderRef, {
            id: parseInt(id),
            firstname: firstname || '',
            lastname: lastname || '',
            teamId: parseInt(teamId) || 0,
            price: parseInt(price)
          }, { merge: true });
          
          updatedCount++;
        } catch (docErr) {
          errors.push(`Fout bij rider ${id}: ${docErr.message}`);
        }
      }
      
      if (errors.length > 0) {
        console.error('Upload errors:', errors);
        alert(`⚠️ ${updatedCount} renners geüpdatet, ${errors.length} fouten.\nCheck console voor details.`);
      } else {
        alert(`✓ ${updatedCount} renners succesvol geüpdatet!`);
      }
      
      // Herlaad riders
      await loadRiders();
      
      // Reset file input
      event.target.value = '';
      
    } catch (err) {
      console.error('Upload fout:', err);
      alert('✗ Upload mislukt: ' + err.message);
    }
  };