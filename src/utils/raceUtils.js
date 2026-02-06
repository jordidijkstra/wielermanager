// Helper to safely parse dates (handles Strings, Date objects, and Firestore Timestamps)
export const safeDate = (dateInput) => {
    if (!dateInput) return null;
    let d;
    if (dateInput.toDate && typeof dateInput.toDate === 'function') {
        d = dateInput.toDate();
    } else if (dateInput instanceof Date) {
        d = dateInput;
    } else if (typeof dateInput === 'string') {
        d = new Date(dateInput);
    }
    
    // Check if valid date
    if (d && !isNaN(d.getTime())) return d;
    return null;
  };

  // Helper function to determine status based on startDate and endDate
export const getStatusByDate = (startDate, endDate) => {
    const sDate = safeDate(startDate);
    
    // If no start date, we can't determine anything -> TBA
    if (!sDate) return 'to be announced';
    
    // If no end date, assume 1-day race (use start date as end date)
    const eDate = safeDate(endDate) || new Date(sDate);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Normalize comparison dates
    const raceEndDate = new Date(eDate);
    raceEndDate.setHours(0, 0, 0, 0);
    
    // Check for invalid dates in comparison
    if (isNaN(raceEndDate.getTime())) return 'to be announced';
    
    const raceStartDate = new Date(sDate);
    raceStartDate.setHours(0, 0, 0, 0);
    
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    if (raceEndDate < today) {
        return 'raced';
    } else if (raceStartDate <= sevenDaysFromNow) {
        return 'raced soon';
    } else {
        return 'raced later';
    }
};

  // Helper function to get CSS class based on status
export const getStatusClass = (status) => {
    switch (status) {
        case 'raced':
        return 'status-raced';
        case 'raced soon':
        return 'status-raced-soon';
        case 'raced later':
        return 'status-raced-later';
        case 'to be announced':
        return 'status-tba';
        default:
        return '';
    }
};