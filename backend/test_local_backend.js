const axios = require('axios');

async function testBackend() {
  try {
    const payload = {
      language: 'javascript',
      version: '18.15.0',
      files: [
        {
          name: 'main.js',
          content: 'console.log("Hello from backend test!");'
        }
      ]
    };
    
    console.log('Calling local backend...');
    const response = await axios.post('http://localhost:3000/api/execute', payload);
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Backend Request Failed!');
    if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
        console.error('Error:', error.message);
    }
  }
}

testBackend();
