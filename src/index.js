import BpmnModeler from 'bpmn-js/lib/Modeler';
import DriveAppsUtil from 'drive-apps-util';
import MarterialDesign from 'material-design-lite';



if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('worker.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}


let id = "0B-K7oJWHTbZ8RjZ0LWhEM3JQbm8";

let options = {
  "clientId": "292206642696-eik80a3lc7b2ajp7sfcg2p8tkmiumbc4.apps.googleusercontent.com",
  "scope": [
    "profile",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive.install"
  ]
};

let driveAppsUtil = new DriveAppsUtil(options);
driveAppsUtil.init().then(() => {
  driveAppsUtil.login().then((user) => {
    showUserImage(user);

    if (window.location.search) {
      let state = JSON.parse(decodeURI(window.location.search.substr(7)));
      if (state.action === "open") {
        id = state.ids[0];
        driveAppsUtil.getDocumentContent(id).then((text) => {
          window.localStorage.setItem("bpmndoc", text);
          loadViewer(text);
        }, (reason) => {
          showErrorMessage(reason);
        });
        driveAppsUtil.getDocumentMeta(id).then((fileinfo) => {
          document.getElementById('docinfo').textContent = fileinfo.name;
          document.getElementById('docinfodrawer').textContent = fileinfo.name;
          document.title = fileinfo.name;
          window.localStorage.setItem("bpmndoctitle", fileinfo.name);
        }, (reason) => {
          showErrorMessage(reason);
        });
      }
      else if (state.action === 'create') {
        create(state.folderId);
      }
    }
    else {
      let text = window.localStorage.getItem("bpmndoc");
      if (text) {
        loadViewer(text);
        document.getElementById('docinfo').textContent = window.localStorage.getItem("bpmndoctitle");
        document.getElementById('docinfodrawer').textContent = window.localStorage.getItem("bpmndoctitle");
        document.title = window.localStorage.getItem("bpmndoctitle");
      }
    }

  });
});

window.exportSVG = function saveSVG() {
  editor.saveSVG({}, function (err, svgdata) {
    var DOMURL = window.URL || window.webkitURL || window;
    var svgBlob = new Blob([svgdata], { type: 'image/svg+xml;charset=utf-8' });
    var url = DOMURL.createObjectURL(svgBlob);

    var event = new MouseEvent('click', {
      'view': window,
      'bubbles': true,
      'cancelable': true
    });

    var a = document.createElement('a');
    a.setAttribute('download', document.getElementById('docinfo').textContent + ".svg");
    a.setAttribute('href', url);
    a.setAttribute('target', '_blank');
    a.dispatchEvent(event);
  });
}

window.save = () => {
  editor.saveXML({ format: true }, function (err, xml) {
    let metadata = JSON.stringify({
      name: document.title,
      mimeType: "application/bpmn+xml"
    });

    driveAppsUtil.updateDocument(id, metadata, xml).then((fileinfo) => {
      document.getElementById('docinfo').textContent = fileinfo.name;
      document.getElementById('docinfodrawer').textContent = fileinfo.name;
      document.title = fileinfo.name;
      window.localStorage.setItem("bpmndoctitle", fileinfo.name);
      showInfoMessage("BPMN model stored")
    });

  });
}

function create(folderId) {
  let initialDiagram =
  '<?xml version="1.0" encoding="UTF-8"?>' +
  '<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
                    'xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
                    'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" ' +
                    'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" ' +
                    'targetNamespace="http://bpmn.io/schema/bpmn" ' +
                    'id="Definitions_1">' +
    '<bpmn:process id="Process_1" isExecutable="false">' +
      '<bpmn:startEvent id="StartEvent_1"/>' +
    '</bpmn:process>' +
    '<bpmndi:BPMNDiagram id="BPMNDiagram_1">' +
      '<bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">' +
        '<bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">' +
          '<dc:Bounds height="36.0" width="36.0" x="173.0" y="102.0"/>' +
        '</bpmndi:BPMNShape>' +
      '</bpmndi:BPMNPlane>' +
    '</bpmndi:BPMNDiagram>' +
  '</bpmn:definitions>';
  let metadata = JSON.stringify({
    name: "New Process",
    mimeType: "application/bpmn+xml",
    parents: [folderId]
  });
  driveAppsUtil.createDocument(metadata, initialDiagram).then((fileinfo) => {
    id = fileinfo.id;
    window.localStorage.setItem("bpmndoc", initialDiagram);
    loadViewer(initialDiagram);
    document.getElementById('docinfo').textContent = fileinfo.name;
    document.getElementById('docinfodrawer').textContent = fileinfo.name;
    document.title = fileinfo.name;
    window.localStorage.setItem("bpmndoctitle", fileinfo.name);
    showInfoMessage("New BPMN process created")

  });
}

function showUserImage(user) {
  document.getElementById('userimage').classList.remove("is-hidden");
  document.getElementById('userimage').classList.add("visible");
  document.getElementById('userimage').src = user.get().getBasicProfile().getImageUrl();
}

function loadViewer(text) {
  var editor = new BpmnModeler({ container: '#editor', position: "absolute" });
  window.editor = editor;
  document.getElementById('splash').style.visibility = "hidden";
  editor.importXML(text, done);  
}

var done = function (err) {

  if (err) {
    showErrorMessage('Error loading BPMN model: ' + err);
  }
  else {
    editor.get('canvas').zoom('fit-viewport', 'auto');
    showInfoMessage('BPMN model loaded');
  }
};

function showErrorMessage(message) {
  if (typeof message.status !== 'undefined') {
    if (message.status === 404) {
      message = 'BPMN model not found.';
    }

  }
  var notification = document.querySelector('.mdl-js-snackbar');
  notification.MaterialSnackbar.showSnackbar(
    {
      message: message,
      timeout: 10000
    }
  );
}

function showInfoMessage(message) {
  var notification = document.querySelector('.mdl-js-snackbar');
  notification.MaterialSnackbar.showSnackbar(
    {
      message: message
    }
  );
}