var admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FCM_PROJECT_ID,
        clientEmail: process.env.FCM_CLIENT_EMAIL,
        privateKey: process.env.FCM_PRIVATE_KEY
    }),
    databaseURL: process.env.FCM_DATABASE_URL
})

module.exports = () => {
    var date = new Date();
    var message = {
        notification: {
            title: 'Order Received',
            body: date.toLocaleTimeString().replace(/:\d+ /, ' ')
        },
        token: process.env.ORDER_NOTIFICATION_RECEIVER_TOKEN
    };
    
    admin.messaging().send(message)
    .then(response => {
        console.log('Successfully sent with response: ', response);
    }).catch(error => {
        console.log('Error sending message:', error);
    })
}
