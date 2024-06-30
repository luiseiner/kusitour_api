const express = require('express');
const router = express.Router();
const db = require('../config/db');
const s3 = require('../config/s3');
const multer = require('multer');
const path = require('path');
const upload = multer({ storage: multer.memoryStorage() });

// Obtener todos los restaurantes o solo los que son publicidad
router.get('/', (req, res) => {
    let sqlQuery = 'SELECT * FROM restaurantes';
    const queryParams = [];

    if (req.query.publicidad === '1') {
        sqlQuery += ' WHERE es_publicidad = 1';
    }

    db.query(sqlQuery, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching restaurants: ', err);
            return res.status(500).send(err);
        }
        res.json(results);
    });
});

// Obtener restaurante por ID
router.get('/:id', (req, res) => {
    const { id } = req.params;
    db.query('SELECT * FROM restaurantes WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error('Error fetching restaurant: ', err);
            return res.status(500).send(err);
        }
        res.json(result);
    });
});

// Actualizar valoración del restaurante por ID
router.post('/:id/valoracion', (req, res) => {
    const { id } = req.params;
    const { valoracion, comentario } = req.body;

    // Insertar la nueva valoración
    const sqlInsert = 'INSERT INTO valoraciones (item_id, tipo_item, valoracion, comentario) VALUES (?, ?, ?, ?)';
    db.query(sqlInsert, [id, 'restaurante', valoracion, comentario], (err, result) => {
        if (err) {
            console.error('Error inserting rating: ', err);
            return res.status(500).send(err);
        }

        // Calcular la nueva valoración promedio
        const sqlAvg = 'SELECT AVG(valoracion) AS promedio FROM valoraciones WHERE item_id = ? AND tipo_item = ?';
        db.query(sqlAvg, [id, 'restaurante'], (err, avgResult) => {
            if (err) {
                console.error('Error calculating average rating: ', err);
                return res.status(500).send(err);
            }

            const promedio = avgResult[0].promedio;
            const newAvgRating = promedio !== null ? Number(promedio).toFixed(2) : '0.00';

            // Actualizar la valoración promedio en la tabla de restaurantes
            const sqlUpdate = 'UPDATE restaurantes SET valoracion = ? WHERE id = ?';
            db.query(sqlUpdate, [newAvgRating, id], (err, updateResult) => {
                if (err) {
                    console.error('Error updating average rating: ', err);
                    return res.status(500).send(err);
                }
                res.json({ newAvgRating });
            });
        });
    });
});



module.exports = router;
