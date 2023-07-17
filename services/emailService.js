const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const rootDirectory = path.resolve(__dirname, '../');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const dayjs = require('dayjs');
const pdf2pic = require('pdf2pic');
const gm = require('gm').subClass({ imageMagick: true, appPath: 'C:/path/to/GraphicsMagick' });

const options = {
    density: 100,
    saveFilename: "invoice",
    savePath: "./",
    format: "png",
    width: 600,
    height: 600
};



// Email configuration
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_SMTP_HOST,
    port: process.env.MAIL_SMTP_PORT, // or your SMTP port
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.MAIL_USER, // your email address
        pass: process.env.MAIL_PASSWORD // your email password
    }
});

function readFileAsync(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, (error, data) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(data);
        });
    });
}

function writeFileAsync(filePath, data) {
    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, data, (error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}

async function sendMail(email, order, res) {
    const { recipient, subject, text } = email;

    /* START EDIT INVOICE PDF */

    const invoicePdf = path.join(rootDirectory, 'templates/invoice.pdf');

    try {
        const pdfBytes = await readFileAsync(invoicePdf);
        const pdfDoc = await PDFDocument.load(pdfBytes);

        /* START EDIT FIELDS */

        const companyName = pdfDoc.getForm().getTextField('Company Name');
        companyName.setText(order.user.forename + ' ' + order.user.surname);

        const companyAddress = pdfDoc.getForm().getTextField('Address 2');
        companyAddress.setText(order.user.street);

        const companyCity = pdfDoc.getForm().getTextField('City 2');
        companyCity.setText(order.user.zip + ' ' + order.user.city);

        const companyCountry = pdfDoc.getForm().getTextField('country 2');
        companyCountry.setText(order.user.country);

        const invoiceNr = pdfDoc.getForm().getTextField('invoice number');
        invoiceNr.setText(order.invoice);

        const invoiceDate = pdfDoc.getForm().getTextField('date');
        invoiceDate.setText(dayjs().format('YYYY-MM-DD'));

        const invoiceDueDate = pdfDoc.getForm().getTextField('invoice due date');
        const dueDate = dayjs().add(7, 'day').format('YYYY-MM-DD');
        invoiceDueDate.setText(dueDate);

        order.articles.forEach(article => {
            let exists = false;
            let existNr = 1;

            for(let i = 1; i < 7; i++) {
                if (pdfDoc.getForm().getTextField('item' + i).getText() && pdfDoc.getForm().getTextField('item' + i).getText().includes(article.title)) {
                    exists = true;
                    existNr = i;
                    break;
                }
            }

            if(exists) {
                const oldCount = parseInt(pdfDoc.getForm().getTextField('quantity' + existNr).getText());
                const newCount = oldCount + 1;
                pdfDoc.getForm().getTextField('quantity' + existNr).setText(newCount.toString());

                const oldPrice = parseFloat(pdfDoc.getForm().getTextField('amount' + existNr).getText().substring(0, pdfDoc.getForm().getTextField('amount' + existNr).getText().length-2));
                const newPrice = oldPrice + article.price;
                pdfDoc.getForm().getTextField('amount' + existNr).setText(newPrice.toString() + ' €');
            } else {
                let freeField = 1;
                for(let i = 1; i < 7; i++) {
                    const textFieldExists = !!pdfDoc.getForm().getTextField('item' + i).getText();
                    if(!textFieldExists) {
                        freeField = i;
                        break;
                    }
                }

                pdfDoc.getForm().getTextField('item' + freeField).setText(article.title);
                pdfDoc.getForm().getTextField('description' + freeField).setText(article.description || ' ');
                pdfDoc.getForm().getTextField('quantity' + freeField).setText('1');
                pdfDoc.getForm().getTextField('price' + freeField).setText(article.price + " €");
                pdfDoc.getForm().getTextField('tax' + freeField).setText("0 %");
                pdfDoc.getForm().getTextField('amount' + freeField).setText(article.price + " €");
            }
        });

        const totalPrice = order.articles.reduce((acc, article) => acc + article.price, 0);
        pdfDoc.getForm().getTextField('total').setText(totalPrice + ' €');

        pdfDoc.getForm().flatten();

        /* STOP EDIT FIELDS */



        const modifiedPdfBytes = await pdfDoc.save();

        const modifiedPdfFilePath = path.join(rootDirectory, 'templates/invoice_modified.pdf');
        await writeFileAsync(modifiedPdfFilePath, modifiedPdfBytes);

        /* END EDIT INVOICE PDF */

        const data = await readFileAsync(modifiedPdfFilePath);

        // Email options
        const mailOptions = {
            from: 'Brokoly Invoice <' + process.env.MAIL_USER + '>', // your email address
            to: recipient,
            subject: subject,
            text: text,
            bcc: [
                'invoices@shop.brokoly.de'
            ],
            attachments: [
                {
                    filename: 'invoice_' + order.invoice + '.pdf',
                    content: data,
                    contentType: 'application/pdf',
                }
            ],
        };

        // Send the email
        await transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                res.status(500).json({ message: 'Internal server error', error: error });
            } else {
                console.log('Email sent:', info.response);
                res.json({ message: 'Email sent successfully' });
            }
        });
    } catch (error) {
        console.error('Error reading or modifying PDF file:', error);
        res.status(500).json({ message: 'Internal server error', error: error });
    }
}

module.exports = {
    sendMail
};
