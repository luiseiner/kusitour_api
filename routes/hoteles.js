const express = require('express');
const router = express.Router();
const db = require('../config/db');
const s3 = require('../config/s3');
const multer = require('multer');
const path = require('path');
const upload = multer({ storage: multer.memoryStorage() });

// Obtener todos los hoteles o solo los que son publicidad
router.get('/', (req, res) => {
    let sqlQuery = 'SELECT * FROM hoteles';
    const queryParams = [];

    if (req.query.publicidad === '1') {
        sqlQuery += ' WHERE es_publicidad = 1';
    }

    db.query(sqlQuery, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching hotels: ', err);
            return res.status(500).send(err);
        }
        res.json(results);
    });
});

// Obtener hotel por ID
router.get('/:id', (req, res) => {
    const { id } = req.params;
    db.query('SELECT * FROM hoteles WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error('Error fetching hotel: ', err);
            return res.status(500).send(err);
        }
        res.json(result);
    });
});

// Actualizar valoración del hotel por ID
router.post('/:id/valoracion', (req, res) => {
    const { id } = req.params;
    const { valoracion, comentario } = req.body;

    // Verificar que los valores no sean nulos
    if (valoracion === undefined || valoracion === null) {
        return res.status(400).send({ error: 'La valoración es requerida' });
    }

    // Insertar la nueva valoración
    const sqlInsert = 'INSERT INTO valoraciones (item_id, tipo_item, valoracion, comentario) VALUES (?, ?, ?, ?)';
    db.query(sqlInsert, [id, 'hotel', valoracion, comentario], (err, result) => {
        if (err) {
            console.error('Error inserting rating: ', err);
            return res.status(500).send(err);
        }

        // Calcular la nueva valoración promedio
        const sqlAvg = 'SELECT AVG(valoracion) AS promedio FROM valoraciones WHERE item_id = ? AND tipo_item = ?';
        db.query(sqlAvg, [id, 'hotel'], (err, avgResult) => {
            if (err) {
                console.error('Error calculating average rating: ', err);
                return res.status(500).send(err);
            }

            // Agregar un log para verificar el resultado de avgResult
            console.log('avgResult:', avgResult);

            const promedio = avgResult[0].promedio;
            const newAvgRating = promedio !== null ? Number(promedio).toFixed(2) : '0.00';

            // Log de la nueva valoración promedio
            console.log(`Nueva valoración promedio para hotel ${id}: ${newAvgRating}`);

            // Actualizar la valoración promedio en la tabla de hoteles
            const sqlUpdate = 'UPDATE hoteles SET valoracion = ? WHERE id = ?';
            db.query(sqlUpdate, [newAvgRating, id], (err, updateResult) => {
                if (err) {
                    console.error('Error updating average rating: ', err);
                    return res.status(500).send(err);
                }

                // Verificar el resultado de la actualización
                console.log('Resultado de la actualización:', updateResult);
                
                res.json({ newAvgRating });
            });
        });
    });
});

module.exports = router;
