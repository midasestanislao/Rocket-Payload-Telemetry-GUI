const express = require('express');
const path = require('path');
const http = require('http');
const { SerialPort, ReadlineParser } = require('serialport');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Variables globales
let counter = 0;

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configurar middleware para servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, '..', 'public')));

// Ruta para servir el archivo HTML principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Ruta para servir el archivo HTML del mapa
app.get('/map', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'map.html'));
});

// Configuración de SerialPort
const mySerial = new SerialPort({ path: 'COM7', baudRate: 9600 });
// const mySerial = new SerialPort({ path: 'COM5', baudRate: 115200 });
// const mySerial = new SerialPort({ path: 'COM8', baudRate: 115200 }); 
const parser = mySerial.pipe(new ReadlineParser({ delimiter: '\n' }));

// Manejar conexión del puerto serial
mySerial.on('open', () => {
    console.log('Open Serial Port');
});

// Conectar a la base de datos
const db = new sqlite3.Database(path.join(__dirname, 'test.db'), (err) => {
    if (err) {
        return console.error(err.message);
    }

    db.run(`
        CREATE TABLE IF NOT EXISTS sensor_data (
            time INTEGER,
            battery_1 REAL,
            battery_2 REAL,
            temperature_1 REAL,
            humidity_1 REAL,
            pressure_1 REAL,
            temperature_2 REAL,
            humidity_2 REAL,
            pressure_2 REAL,
            accX REAL,
            accY REAL,
            accZ REAL,
            gyrX REAL,
            gyrY REAL,
            gyrZ REAL,
            latitude REAL,
            longitude REAL,
            satellite REAL,
            precision REAL,
            altitud REAL
        )
    `, (err) => {
        if (err) {
            return console.error(err.message);
        }
        console.log('Table created or verified');
    });
});

// Crear un archivo CSV
const csvWriter = createCsvWriter({
    path: path.join(__dirname, 'data.csv'),
    header: [
        { id: 'time', title: 'TIME' },
        { id: 'battery_1', title: 'BATTERY_1' },
        { id: 'battery_2', title: 'BATTERY_2' },
        { id: 'temperature_1', title: 'TEMPERATURE_1' },
        { id: 'humidity_1', title: 'HUMIDITY_1' },
        { id: 'pressure_1', title: 'PRESSURE_1' },
        { id: 'temperature_2', title: 'TEMPERATURE_2' },
        { id: 'humidity_2', title: 'HUMIDITY_2' },
        { id: 'pressure_2', title: 'PRESSURE_2' },
        { id: 'accX', title: 'ACC_X' },
        { id: 'accY', title: 'ACC_Y' },
        { id: 'accZ', title: 'ACC_Z' },
        { id: 'gyrX', title: 'GYR_X' },
        { id: 'gyrY', title: 'GYR_Y' },
        { id: 'gyrZ', title: 'GYR_Z' },
        { id: 'latitude', title: 'LATITUDE' },
        { id: 'longitude', title: 'LONGITUDE' },
        { id: 'satellite', title: 'SATELLITE' },
        { id: 'precision', title: 'PRECISION' },
        { id: 'altitud', title: 'ALTITUD'}
    ],
    append: true // Adjuntar al archivo en lugar de sobrescribir
});

// Crear un archivo CSV completo
const csvWriterComplete = createCsvWriter({
    path: path.join(__dirname, 'complete_data.csv'),
    header: [
        { id: 'data', title: 'DATA' }
    ],
    append: true // Adjuntar al archivo en lugar de sobrescribir
});

// Variable para almacenar temporalmente los datos recibidos
let temporaryData = null;

parser.on('data', (data) => {
    console.log(data);
    temporaryData = data;
});

// Función para procesar y guardar datos
function processAndSaveData(data) {
    // Patrón de búsqueda para datos esperados
    let regex = /aB-?\d+(\.\d+)?|bB-?\d+(\.\d+)?|aT-?\d+(\.\d+)?|aH\d+(\.\d+)?|aP\d+(\.\d+)?|bT-?\d+(\.\d+)?|bH\d+(\.\d+)?|bP\d+(\.\d+)?|Ax-?\d+(\.\d+)?|Ay-?\d+(\.\d+)?|Az-?\d+(\.\d+)?|Gx-?\d+(\.\d+)?|Gy-?\d+(\.\d+)?|Gz-?\d+(\.\d+)?|La-?\d+(\.\d+)?|Lo-?\d+(\.\d+)?|Sa-?\d+(\.\d+)?|Pr-?\d+(\.\d+)?/g;

    // Buscar valores en la cadena de datos
    const valuesArray = data.match(regex) || [];

    // Convertir los datos en un arreglo de números
    const dataArray = Array(18).fill(0); // Inicializar todos los valores en cero

    valuesArray.forEach((item, index) => {
        dataArray[index] = parseFloat(item.substring(2)); 
    });

    const record = {
        time: counter++,
        battery_1: dataArray[0],
        battery_2: dataArray[1],
        temperature_1: dataArray[2],
        humidity_1: dataArray[3],
        pressure_1: dataArray[4],
        temperature_2: dataArray[5],
        humidity_2: dataArray[6],
        pressure_2: dataArray[7],
        accX: dataArray[8],
        accY: dataArray[9],
        accZ: dataArray[10],
        gyrX: dataArray[11],
        gyrY: dataArray[12],
        gyrZ: dataArray[13],
        latitude: dataArray[14],
        longitude: dataArray[15],
        satellite: dataArray[16],
        precision: dataArray[17],
        altitud: altPresion(dataArray[4]) // Calcula altitud basado en la presión
    };

    const csvRecord = {
        time: record.time,
        battery_1: record.battery_1,
        battery_2: record.battery_2,
        temperature_1: record.temperature_1,
        humidity_1: record.humidity_1,
        pressure_1: record.pressure_1,
        temperature_2: record.temperature_2,
        humidity_2: record.humidity_2,
        pressure_2: record.pressure_2,
        accX: record.accX,
        accY: record.accY,
        accZ: record.accZ,
        gyrX: record.gyrX,
        gyrY: record.gyrY,
        gyrZ: record.gyrZ,
        latitude: record.latitude,
        longitude: record.longitude,
        satellite: record.satellite,
        precision: record.precision,
        altitud: record.altitud
    };

    const csvRecordComplete = {
        data: data
    };

    io.emit('arduino:data', record);

    // Guardar los datos en una base de datos
    db.run(`
        INSERT INTO sensor_data (time, battery_1, battery_2, temperature_1, humidity_1, pressure_1, temperature_2, humidity_2, pressure_2, accX, accY, accZ, gyrX, gyrY, gyrZ, latitude, longitude, satellite, precision, altitud)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [record.time, record.battery_1, record.battery_2, record.temperature_1, record.humidity_1, record.pressure_1, record.temperature_2, record.humidity_2, record.pressure_2, record.accX, record.accY, record.accZ, record.gyrX, record.gyrY, record.gyrZ, record.latitude, record.longitude, record.satellite, record.precision, record.altitud], (err) => {
        if (err) {
            return console.error(err.message);
        }
    });

    // Escribir los datos en el archivo CSV
    csvWriter.writeRecords([csvRecord])
        .then(() => {
            console.log('The CSV file was updated');
        })
        .catch((err) => {
            console.error('Error al escribir en el archivo CSV:', err.message);
        });

    csvWriterComplete.writeRecords([csvRecordComplete])
        .then(() => {
            console.log('The CSV_complete file was updated');
        })
        .catch((err) => {
            console.error('Error al escribir en el archivo CSV:', err.message);
        });
}

// Constante de presión inicial
const presionInicial = 866
.240367; // Presión atmosférica en pascales (Pa)

// Función para calcular altitud basado en presión
function altPresion(presion) {
    const coeficientePresion = presion / presionInicial;
    const h = 44330.08 * (1 - Math.pow(coeficientePresion, 0.190223));
    console.log("Altitud calculada:", h);
    return h;
}

// Intervalo de 1000 milisegundos para procesar y guardar datos
setInterval(() => {
    if (temporaryData) {
        processAndSaveData(temporaryData);
        temporaryData = null; // Resetear el dato temporal después de procesarlo
    }
}, 10);

// Manejar errores del puerto serial
mySerial.on('error', (err) => {
    console.error('Error: ', err.message);
});

// Manejar conexiones de socket.io
io.on('connection', (socket) => {
    console.log('A new socket connected');
});

// Iniciar servidor
server.listen(3000, () => {
    console.log('Server on port', 3000);
});

// Mostrar datos de la base de datos en la consola
const sql = `SELECT * FROM sensor_data`;
db.all(sql, [], (err, rows) => {
    if (err) {
        return console.error(err.message);
    }
    rows.forEach(row => {
        console.log(row);
    });
});
