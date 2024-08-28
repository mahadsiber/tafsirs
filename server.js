const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Sample data (replace with your actual data)
const surahs = [
    { name: 'Surah Al-Fatihah', content: 'Content of Surah Al-Fatihah...' },
    { name: 'Surah Al-Baqarah', content: 'Content of Surah Al-Baqarah...' },
    { name: 'Surah Ali Imran', content: 'Content of Surah Ali Imran...' },
    // Add more surahs as needed
];

// Home route
app.get('/', (req, res) => {
    res.render('index', { surahs });
});

// Route to display a surah
app.get('/surah/:name', (req, res) => {
    const surah = surahs.find(s => s.name === req.params.name);
    res.render('surah', { surah });
});

// Search route
app.post('/search', (req, res) => {
    const query = req.body.query.toLowerCase();
    const results = surahs.map(surah => {
        return {
            name: surah.name,
            verses: surah.content.split('\n').filter(verse => verse.toLowerCase().includes(query))
        };
    }).filter(result => result.verses.length > 0);

    res.render('search', { results, query });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});