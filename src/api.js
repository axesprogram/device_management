export const callApi = async (action, data = {}) => {
  const url = 'https://script.google.com/macros/s/AKfycbw3Eg3JEqNCgekdvfSpr2uau2UwQqmYOoqdOSWvcinhEKe-wIU3bJCqW4Ov8jPWGDG9/exec';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, data })
  });

  if (!response.ok) throw new Error('網路回應錯誤');
  return await response.json();
};