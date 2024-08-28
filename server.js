const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const xml2js = require('xml2js');
const app = express();
const port = 3000;

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
    const surah = surahMap[surahNumber];
    if (surah) {
        const content = await Promise.all(surah.map(async part => {
            const fileContent = await fs.readFile(path.join(__dirname, 'data', part.file), 'utf8');
            const cleanedContent = await parseXML(fileContent);
            return cleanedContent;
        }));
        res.render('surah', { name: surah.name, content: content.join('') });
    } else {
        res.status(404).send('Surah not found');
    }
});

// Search route
app.post('/search', async (req, res) => {
    const query = req.body.query.toLowerCase();
    const results = [];

    for (const surahNumber of Object.keys(surahMap)) {
        const surah = surahMap[surahNumber];
        for (const part of surah) {
            const fileContent = await fs.readFile(path.join(__dirname, 'data', part.file), 'utf8');
            const parser = new xml2js.Parser();
            const parsedContent = await parser.parseStringPromise(fileContent);
            const verses = parsedContent.html.body[0].div[0].div[0].div;
            verses.slice(part.start - 1, part.end).forEach((verse, index) => {
                const verseText = verse['span'][0]['span'][0]['_'];
                if (verseText.toLowerCase().includes(query)) {
                    results.push({
                        surah: surahNumber,
                        verse: part.start + index,
                        text: verseText
                    });
                }
            });
        }
    }

    res.render('search', { results, query });
});

// Load surahMap before starting the server
loadSurahMap().then(() => {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}).catch(err => {
    console.error('Failed to load surahMap:', err);
});