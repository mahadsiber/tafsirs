const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const xml2js = require('xml2js');
const app = express();
const port = 3333;
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('arrazi.db');

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Load surah_map.json
let surahMap;
const loadSurahMap = async () => {
    const surahMapPath = path.join(__dirname, 'data', 'surah_map.json');
    const surahMapContent = await fs.readFile(surahMapPath, 'utf8');
    surahMap = JSON.parse(surahMapContent);

    // Extract surah names from XML files
    for (const surahNumber of Object.keys(surahMap)) {
        const surah = surahMap[surahNumber];
        const part = surah[0]; // Assuming the first part contains the surah name
        const fileContent = await fs.readFile(path.join(__dirname, 'data', part.file), 'utf8');
        const parser = new xml2js.Parser();
        const parsedContent = await parser.parseStringPromise(fileContent);
        const surahName = parsedContent.html.body[0].div[0].h1[0]._;
        surahMap[surahNumber].name = surahName;
    }
};

// Function to parse XML
const parseXML = (xmlContent) => {
    return new Promise((resolve, reject) => {
        // Remove <a class="vn"> elements using a regular expression
        const cleanedContent = xmlContent.replace(/<a class="vn".*?<\/a>/g, '');
        resolve(cleanedContent);
    });
};

// Home route
app.get('/', (req, res) => {
    res.render('index', { surahs: Object.keys(surahMap).map(key => ({ number: key, name: surahMap[key].name })) });
});

// Route to display a surah
app.get('/surah/:number', async (req, res) => {
    const surahNumber = req.params.number;
    const query = req.query.query || ''; // Get the query parameter

    // Fetch surah content from XML files
    const surah = surahMap[surahNumber];
    if (surah) {
        const content = await Promise.all(surah.map(async part => {
            const fileContent = await fs.readFile(path.join(__dirname, 'data', part.file), 'utf8');
            const cleanedContent = await parseXML(fileContent);
            return cleanedContent;
        }));
        res.render('surah', { name: surah.name, content: content.join(''), query: '' });
    } else {
        res.status(404).send('Surah not found');
    }
});

// Search route
app.post('/search', (req, res) => {
    const query = req.body.query.toLowerCase();

    console.log('Search Query:', query);  // Debugging statement

    db.all(`
        SELECT surahs.id, surahs.name, paragraphs.content 
        FROM paragraphs 
        JOIN surahs ON paragraphs.surah_id = surahs.id 
        WHERE paragraphs.content LIKE ?
    `, [`%${query}%`], (err, rows) => {
        if (err) {
            console.error('Database Error:', err);  // Debugging statement
            return res.status(500).send('Database error');
        }

        console.log('Search Results:', rows);  // Debugging statement

        const results = rows.map(row => {
            const content = row.content;
            const index = content.toLowerCase().indexOf(query);
            const start = Math.max(0, index - 10);
            const end = Math.min(content.length, index + query.length + 10);
            const context = content.slice(start, end);
            const highlightedContext = context.replace(new RegExp(query, 'gi'), match => `<strong style="color: green;">${match}</strong>`);

            return {
                surahId: row.id,
                surahName: row.name,
                context: highlightedContext
            };
        });

        res.render('search', { results, query });
    });
});

// Load surahMap before starting the server
loadSurahMap().then(() => {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}).catch(err => {
    console.error('Failed to load surahMap:', err);
});