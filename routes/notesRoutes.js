const express = require('express');
const {
  getAllUserNotesByLessonId,
  createUserNoteById,
  deleteUserNoteById
} = require('../controllers/notesController');

const router = express.Router();

router.route('/create').post(createUserNoteById);

router.route('/delete').post(deleteUserNoteById);

router.route('/').post(getAllUserNotesByLessonId);


module.exports = router;