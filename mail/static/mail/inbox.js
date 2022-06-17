let theAlert = document.querySelector('.error-alert');
let inboxBtn = document.querySelector('#inbox');
let sentBtn = document.querySelector('#sent');
let archivedBtn = document.querySelector('#archived');
let composeBtn = document.querySelector('#compose');
let composeForm = document.querySelector('#compose-form');

let emailsView = document.querySelector('#emails-view');
let composeView = document.querySelector('#compose-view');
let singleEmailView = document.querySelector('#single-email');

let composeRecipients = document.querySelector('#compose-recipients');
let composeSubject = document.querySelector('#compose-subject');
let composeBody = document.querySelector('#compose-body');

window.onpopstate = function(event) {
    if (event.state.mailbox === "compose-email") {
      compose_email();
    } else {
      load_mailbox(event.state.mailbox);
    }
}

// Use buttons to toggle between views
inboxBtn.addEventListener('click', () => {
  history.pushState({mailbox: 'inbox'}, "", `inbox`);
  load_mailbox('inbox');
});
sentBtn.addEventListener('click', () => {
  history.pushState({mailbox: 'sent'}, "", `sent`);
  load_mailbox('sent');
});
archivedBtn.addEventListener('click', () => {
  history.pushState({mailbox: 'archive'}, "", `archive`);
  load_mailbox('archive')
});
composeBtn.addEventListener('click', ()=> {
  history.pushState({mailbox: 'compose-email'}, "", `compose-email`);
  compose_email();
});
// By default, load the inbox
load_mailbox('inbox');
// Send emails inside compose view
composeForm.addEventListener('submit', sendEmail);
// Close btn in the Alert Msg div
document.querySelector('.close').addEventListener('click', function() {
  document.querySelector('.msg-container').style.display = "none";
});

////////////////////////////////////Start Functions ////////////////////////////////////////////

// Mark email as read
function markRead(id) {
  fetch(`/emails/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      read: true
    })
  })
};

// Mark email as unread
function markUnRead(id) {
  fetch(`/emails/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      read: false
    })
  })
};

// Archieve Email
function archiveEmail(id){
  fetch(`/emails/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        archived: true
      })
    })
  .then(() => alertMsg("Email is archived"))
  .then(() => load_mailbox('inbox'))
};

// Unarchieve Email
function unarchiveEmail(id) {
  fetch(`/emails/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      archived: false
    })
  })
  .then(() => alertMsg("Email is unarchived"))
  .then(() => load_mailbox('inbox'))
};

// Open Email
function openEmail(email) {
  markRead(email.id);
  singleEmailView.innerHTML = "";
  emailsView.style.display = 'none';
  singleEmailView.style.display = 'block';

  var subject = document.createElement('div');
  subject.innerHTML = `<strong>From: </strong>${email.sender}`;
  singleEmailView.append(subject); 

  var receiver = document.createElement('div');
  receiver.innerHTML = `<strong>To: </strong>${email.recipients}`;
  singleEmailView.append(receiver); 

  var subject = document.createElement('div');
  subject.innerHTML = `<strong>Subject: </strong>${email.subject}`;
  singleEmailView.append(subject); 

  var time = document.createElement('div');
  time.innerHTML = `<strong>Time: </strong>${email.timestamp}`;
  singleEmailView.append(time); 

  var replyBtn = document.createElement('button');
  replyBtn.classList.add('btn', 'btn-primary', 'm-3');
  replyBtn.innerHTML = `Reply`;
  singleEmailView.append(replyBtn); 

  var archiveBtn = document.createElement('button');
  archiveBtn.classList.add('btn', 'btn-danger', 'm-3');
  if (email.archived) {
    archiveBtn.innerHTML = `Unarchive`;
  } else {
    archiveBtn.innerHTML = `Archive`;
  }

  // Only display the button in archived and inbox view
  if (email.sender != document.querySelector('h2').innerHTML) {
    singleEmailView.append(archiveBtn); 
  }

  replyBtn.addEventListener('click',() => reply(email))
  archiveBtn.addEventListener('click',() => {
    if (archiveBtn.innerHTML == "Unarchive") {
      unarchiveEmail(email.id);
    } else {
      archiveEmail(email.id);
    }
  })

  var hr = document.createElement('hr');
  singleEmailView.append(hr); 

  var body = document.createElement('div');
  body.innerHTML = email.body;
  singleEmailView.append(body);

};

// Delete Email
function deleteEmail(id) {
  fetch(`/emails/${id}`, {method: 'DELETE'})
  .then(() => alertMsg("Email is deleted"))
};

// Reply to an email
function reply(email) {
  showComposeForm();
  
  composeRecipients.value = email.sender;
  composeSubject.value = (email.subject.startsWith('Re:')? email.subject : `Re: ${email.subject}`);
  composeBody.value = `On ${email.timestamp} ${email.sender} wrote:\n${email.body}\n------------------------------------------------------------\n`
};

// Show compose view and hide other views
function showComposeForm() {
  activeBtn(composeBtn);

  composeView.style.display = 'block';
  emailsView.style.display = 'none';
  singleEmailView.style.display = 'none';
}

// Load mailbox
function load_mailbox(mailbox) {
  // Show the mailbox and hide other views
  emailsView.style.display = 'block';
  composeView.style.display = 'none';
  singleEmailView.style.display = 'none';

  // Show the mailbox name
  document.querySelector('#emails-view .view-title').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // Highlight the current view btn
  if (mailbox === 'inbox') {
    activeBtn(inboxBtn);
  } else if (mailbox === 'sent') {
    activeBtn(sentBtn);
  } else if (mailbox === 'archive') {
    activeBtn(archivedBtn);
  }

  // Requesting emails and display them in the table
  fetch(`/emails/${mailbox}`)
    .then((response) => response.json())
    .then((emails) => {
      displayEmails(mailbox, emails);
    })
};

// Highlight the button of the current view
function activeBtn(btn) {
  let btns = [inboxBtn, sentBtn, archivedBtn, composeBtn];
  for (var i = 0; i<btns.length; i++) {
    if (btn === btns[i]) {
      btns[i].classList.add('bg-pink');
      continue;
    } else {
      btns[i].classList.remove('bg-pink');
    }
  }
};

// Display emails in HTML
function displayEmails(mailbox, emails) {
  // Select the table
  var tableBody = document.querySelector('table');
  tableBody.innerHTML = "";

  emails.forEach((email) => {
    // Table row
    let tableRow = document.createElement('tr');
    tableBody.append(tableRow);

    // Upper Icons Div
    let tableDiv = document.createElement('div');
    tableDiv.classList.add('icons');
    tableRow.append(tableDiv);

    let iconsDiv = document.createElement('div');
    iconsDiv.classList.add('icons-flex');
    tableDiv.append(iconsDiv);

    let readIcon = document.createElement('div');
    let unreadIcon = document.createElement('div');
    let archIcon = document.createElement('div');
    let unarchIcon = document.createElement('div');
    let delIcon = document.createElement('div');

    let iconsClass = ['readIcon', 'unreadIcon', 'archIcon', 'unarchIcon', 'delIcon'];
    let iconsElements = [readIcon, unreadIcon, archIcon, unarchIcon, delIcon];
    let fragment = document.createDocumentFragment();

    for (var i = 0; i < iconsElements.length; i++) {
      iconsElements[i].classList.add(iconsClass[i], 'icon-div', 'margin', 'pointer');
      fragment.append(iconsElements[i]);
      
      // Display none for all icons except delete icon
      if (i==4) {
        continue;
      } else {
        iconsElements[i].style.display = "none";
      }
    }

    var childNodes = fragment.childNodes;

    readIcon.innerHTML = "<i class='fa-solid fa-folder-open readIcon'></i>";
    unreadIcon.innerHTML = "<i class='fa-solid fa-folder-closed unreadIcon'></i>";
    archIcon.innerHTML = "<i class='fa-solid fa-box-archive archIcon'></i>";
    unarchIcon.innerHTML = "<i class='fa-solid fa-inbox unarchIcon'></i>";
    delIcon.innerHTML = "<i class='fa-solid fa-trash-can delIcon'></i>";

    let labels = ["mark as read", "mark as unread","archive", "unarchive", "delete"];

    for (var i=0; i<childNodes.length;i++) {
      let label = document.createElement('div');
      label.classList.add('label');
      label.innerHTML = labels[i];
      childNodes[i].appendChild(label);
    }

    iconsDiv.append(fragment);

    if (email.read) {
      tableRow.classList.add('bg-black');
      unreadIcon.style.display = "flex";
    } else {
      readIcon.style.display = "flex";
    }

    // Select Box
    let selectBox = document.createElement('td');
    tableRow.append(selectBox);
    selectBox.innerHTML = `<input type="checkbox" name="select">` 
    selectBox.classList.add('select-box');

    if (mailbox === 'sent') {
      // Reciever
      let receiver = document.createElement('td');
      tableRow.append(receiver);
      receiver.innerHTML = `To:&nbsp;${email.recipients.join('; ')}`;
      receiver.classList.add('receiver');

    } else if (mailbox === 'inbox' || mailbox === 'archive') {
      // Sender
      let sender = document.createElement('td');
      tableRow.append(sender);
      sender.innerHTML = email.sender;
      sender.classList.add('sender');

      if (mailbox === 'inbox') {
        archIcon.style.display = "flex";
      } else if (mailbox === 'archive') {
        unarchIcon.style.display = "flex";
      }

    }

    // Subject and Body containers
    let content = document.createElement('td');
    let subject = document.createElement('div');
    let emailBody = document.createElement('div');

    subject.classList.add('subject');
    emailBody.classList.add('email-body');

    content.appendChild(subject);
    content.appendChild(emailBody);
    tableRow.append(content);

    // Subject
    if (email.subject == "") {
      subject.innerHTML = "No Subject"
    } else {
      subject.innerHTML = email.subject;
    }

    // Body
    emailBody.innerHTML = ` <span>&nbsp;-&nbsp;</span>${email.body}`;
    content.classList.add('content');

    // Time
    let time = document.createElement('td');
    tableRow.append(time);
    time.innerHTML = email.timestamp;
    time.classList.add('time')

    // Actions on email row in the table
    let emailID = email.id;
    tableRow.addEventListener('click', (e)=>{
      if (e.target.classList.contains('readIcon')) {
        markRead(emailID);
        tableRow.classList.add('bg-black');
        unreadIcon.style.display = "flex";
        readIcon.style.display = "none";
      } else if (e.target.classList.contains('unreadIcon')) {
        markUnRead(emailID);
        tableRow.classList.remove('bg-black');
        unreadIcon.style.display = "none";
        readIcon.style.display = "flex";
      } else if (e.target.classList.contains('archIcon')) {  
        tableRow.style.animationPlayState = 'running';
        archiveEmail(emailID);
      } else if (e.target.classList.contains('unarchIcon')) {
        tableRow.style.animationPlayState = 'running';
        unarchiveEmail(emailID);
      } else if (e.target.classList.contains('delIcon')) {
        tableRow.style.animationPlayState = 'running';
        tableRow.addEventListener('animationend', () => {
          tableRow.remove();
        });
        deleteEmail(emailID);
      } else {
        openEmail(email);
      }
    })
  })
};

// Writing Email
function compose_email() {
  showComposeForm();
  // Clear out composition fields
 composeRecipients.value = '';
  composeSubject.value = '';
  composeBody.value = '';

  // Hide the alert msg in compose form
  theAlert.style.display = "none";
};

// Send Email
function sendEmail(event) {
    event.preventDefault();
    fetch('/emails', {
      method: 'POST',
      body: JSON.stringify({
        recipients: composeRecipients.value,
        subject: composeSubject.value,
        body: composeBody.value
      })
    })
    .then(response => {
        if (!response.ok) {
          return response.text().then(text => {throw new Error(text)})
      } else {
          return response.json()
      }
    })
    .then((data) => {
      alertMsg(data.message);
      load_mailbox('sent');
    })
    .catch(error => {
      var errorObj = JSON.parse(error.message)
      theAlert.innerHTML = errorObj.error;
      theAlert.style.display = 'block';
  })
};

// Alert different messages
function alertMsg(msg){
  document.querySelector('.msg').innerHTML = msg;
  document.querySelector('.msg-container').style.display = "flex";
  setTimeout(() => {
    document.querySelector('.msg-container').style.display = "none";
  }, 4000);
};

//////////////////////////////////// End Functions ////////////////////////////////////////////
