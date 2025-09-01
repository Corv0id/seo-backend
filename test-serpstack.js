require('dotenv').config();

const axios = require('axios');

async function testSerpstackApi() {
  try {
    const response = await axios.get('https://api.serpstack.com/search', {
      params: {
        access_key: process.env.SERPSTACK_API_KEY,
        query: 'seo audit',
        num: 5
      }
    });

    console.log('Serpstack API Test Successful:');
    console.log('Status:', response.status);
    console.log('Number of Results:', response.data.organic_results.length);
    console.log('First Result:', JSON.stringify(response.data.organic_results[0], null, 2));
  } catch (error) {
    console.error('Serpstack API Test Failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testSerpstackApi();