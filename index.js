const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const app = express();
const axios = require('axios');

// Configurazione di Express.js
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Pagina index
app.get('/', (req, res) => {
  res.render('index');
});

// Funzione per generare un nome univoco per il file
function generateUniqueFileName(originalName, index) {
  const extension = originalName.substring(originalName.lastIndexOf('.'));
  const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
  return `${baseName}${index}${extension}`;
}

// Gestione del form
app.post('/download', async (req, res) => {
  var url = req.body.url;
  var html = '';
  try {
    // Avvia un browser headless con Puppeteer
    var browser = await puppeteer.launch();
    var page = await browser.newPage();

    // Vai all'URL specificato
    await page.goto(url, { waitUntil: 'networkidle0' });

    // Ottieni il contenuto della pagina come stringa
    var htmlContent = await page.content();
    html = htmlContent;
    // Utilizza espressioni regolari per trovare il valore di contentUrl e title
    const regexContentUrl = /"contentUrl":"([^"]+)"/;
    const regexTitle = /"title":"([^"]+)"/;

    // Trova il valore di contentUrl utilizzando l'espressione regolare
    const matchContentUrl = htmlContent.match(regexContentUrl);
    const contentUrl = matchContentUrl && matchContentUrl[1];

    // Trova il valore di title utilizzando l'espressione regolare
    var matchTitle = htmlContent.match(regexTitle);
    var Title = matchTitle && matchTitle[1];
    var filePath = `${Title}.pdf`;

    // Controllo se il file esiste già
    let index = 0;
    while (fs.existsSync(filePath)) {
      index++;
      filePath = generateUniqueFileName(Title, index) + '.pdf';
    }

    axios({
      url: contentUrl,
      method: 'GET',
      responseType: 'stream'
    })
      .then(response => {
        response.data.pipe(fs.createWriteStream(filePath));
        console.log('Il file PDF è stato scaricato con successo!');

        // Restituisci una risposta al client per caricare la pagina del PDF
        res.redirect(`/pdf/${encodeURIComponent(filePath)}`);
      })
      .catch(error => {
        console.error('Si è verificato un errore durante il download del file:', error);
        res.status(500).send('Si è verificato un errore durante il download del file PDF.');
      });

    // Chiudi il browser di Puppeteer
    await browser.close();
  } catch (error) {
    res.status(500).send('Si è verificato un errore durante il recupero dei dati.\n' + error);
  }
});

// Gestione della pagina del PDF
app.get('/pdf/:filePath', (req, res) => {
  var filePath = decodeURIComponent(req.params.filePath);
  res.sendFile(filePath, { root: __dirname });
});



// Avvio del server
app.listen(3000, () => {
  console.log('App in ascolto sulla porta 3000');
});
