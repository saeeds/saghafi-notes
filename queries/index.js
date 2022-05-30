const { gql } = require('graphql-request');

exports.GET_USER_NOTES_BY_LESSONID = gql`
  query getUserNotesByLessonId($userId: String!, $lessonId: ID!) {
   userNotes(where:
         { 
          user: $userId, 
          lesson : $lessonId
         }
    ) {
    id
    note
    clientId
    createdAt
  }
}`;

exports.CREATE_USER_NOTE = gql`
mutation createUserNotes($data:UserNoteInput) {
  createUserNote(input : { data : $data }) {
    userNote {
      id
      note
      createdAt
      user {
        id
        username
        email
      }
      lesson {
        id
      }
    }
  }
}
`

exports.DELETE_USER_NOTES = gql`
mutation deleteUserNote($noteId:ID!) {
  deleteUserNote(input : {
     where: { id: $noteId}
   }) {
    userNote {
      id
      note
      createdAt
      user {
        id
        username
        email
      }
      lesson {
        id
      }
    }
  }
}`;


exports.GET_USER_NOTES_BY_CLIENT_ID = gql`
query getUserNotesByClientId($clientId: String!) {
   userNotes(where: { clientId: $clientId} ) {
    id
  }
}`;