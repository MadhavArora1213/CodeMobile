require('dotenv').config();
const axios = require('axios');

async function testBackendProxy() {
  try {
    const payload = {
      language: 'php',
      version: '8.2.3',
      files: [
        {
          name: 'main.php',
          content: '<?php echo "Hello from PHP " . phpversion(); ?>'
        }
      ],
      stdin: "",
      args: [],
      compile_timeout: 10000,
      run_timeout: 3000
    };
    // Backend is on port 3000
    const url = 'http://127.0.0.1:3000/api/v2/execute';
    console.log(`Sending payload to Backend Proxy at: ${url}`);
    const response = await axios.post(url, payload);
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Backend Proxy Request Failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

testBackendProxy();
