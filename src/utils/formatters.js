export const formatPrice = (price) => '€' + (price / 1000000).toFixed(1) + 'M';

export const getFullName = (rider) => `${rider.firstname} ${rider.lastname}`;
