import React, {
  Fragment,
  InputHTMLAttributes,
  useEffect,
  useRef,
  useState,
} from 'react';

import { v4 as uuidv4 } from 'uuid';
import {
  Divider,
  Input,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  Add as AddIcon,
  KeyboardArrowLeft as KeyboardArrowLeftIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
  Send as SendIcon,
} from '@material-ui/icons';
import { Alert } from '@material-ui/lab';

import { HP, isValidUrl, SERVER_URL } from './utils';
import { Color } from '@material-ui/lab/Alert/Alert';

interface Message {
  id: string;
  type: string;
  from: string;
  data: string;
}

const useStyles = makeStyles({
  root: {
    '& > *': {
      margin: 1,
    },
  },
  input: {
    display: 'none',
  },
});

function App() {
  const classes = useStyles();
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [msg, setMsg] = useState('');
  const [notify, setNotify] = useState('');
  const [notifyType, setNotifyType] = useState<Color>('success');
  const [notifyOn, setNotifyOn] = useState(false);
  const websocket = useRef<WebSocket>();
  const id = useRef<string>(uuidv4());

  const websocketSend = (m: string) => {
    const msg = {
      id: uuidv4(),
      type: isValidUrl(m) ? 'link' : 'text',
      from: id.current,
      data: m,
    };
    websocket.current?.send(JSON.stringify(msg));
  };

  const notifyUser = (type: Color, m: string) => {
    setNotify(m);
    setNotifyType(type);
    setNotifyOn(true);
    setTimeout(() => setNotifyOn(false), 3000);
  };

  useEffect(() => {
    const connect = () =>
      new Promise<void>((resolve, reject) => {
        if (websocket.current) {
          resolve();
          return;
        }

        const w = new WebSocket(`ws://${HP}/ws`);
        websocket.current = w;

        const onOpen = () => {
          resolve();
        };

        const onError = () => {
          notifyUser('error', 'Connection error');
          reject('Connection error');
        };

        const onMessage = (e: MessageEvent) => {
          const m = JSON.parse(e.data);
          setMsgs((i) => [...i, m]);
        };

        w.onopen = onOpen;
        w.onerror = onError;
        w.onmessage = onMessage;
      });

    connect()
      .then(() => console.log('connected'))
      .catch(() => console.log('error connecting'));
  }, []);

  const sendFile: InputHTMLAttributes<any>['onChange'] = (e) => {
    console.log(e);
    const files = e.target.files;
    if (!files?.length) return;

    const formData = new FormData();
    const file = files[0];
    formData.append('myFile', file, file.name);
    fetch(`${SERVER_URL}/upload?id=${id.current}`, {
      method: 'POST',
      body: formData,
    })
      .then((r) => r.json())
      .then((json: { success: boolean; error: string }) => {
        const { success, error } = json;
        if (success) {
          notifyUser('success', 'Successfully sent file');
        } else if (error) {
          console.error(error);
          notifyUser('error', error);
        }
      })
      .catch((error) => {
        console.error(error);
        notifyUser('error', 'Failed to send file');
      });
    e.target.value = '';
  };

  const sendMessage = () => {
    const m = msg.trim();
    if (!m) return;

    console.log(`Sending: ${m}`);
    websocketSend(m);
    setMsg('');
  };

  return (
    <div
      style={{
        maxWidth: 1000,
        margin: 'auto',
        padding: 20,
        wordWrap: 'break-word',
      }}
    >
      <div style={{ marginTop: 20, marginBottom: 20 }}>
        <List style={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
          {msgs.map((m, i) => (
            <Fragment key={m.id}>
              {i > 0 ? <Divider variant="inset" component="li" /> : null}
              <ListItem alignItems="flex-start" disableGutters>
                <ListItemIcon style={{ marginTop: 4, minWidth: 24 }}>
                  {m.from === id.current ? (
                    <KeyboardArrowRightIcon color="primary" />
                  ) : (
                    <KeyboardArrowLeftIcon color="primary" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    m.type === 'link' || m.type === 'file' ? (
                      <a
                        href={m.data}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {m.data}
                      </a>
                    ) : (
                      <>
                        {m.data.split('\n').map((i) => (
                          <>
                            {i}
                            <br />
                          </>
                        ))}
                      </>
                    )
                  }
                />
              </ListItem>
            </Fragment>
          ))}
        </List>
      </div>
      <Input
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        onKeyDown={(e) => {
          const code = e.code;
          if (code === 'Enter') {
            sendMessage();
          }
        }}
        style={{ width: '100%' }}
        startAdornment={
          <InputAdornment position="start">
            <input
              accept="*"
              className={classes.input}
              id="contained-button-file"
              type="file"
              onChange={sendFile}
            />
            <label htmlFor="contained-button-file">
              <AddIcon color="primary" style={{ cursor: 'pointer' }} />
            </label>
          </InputAdornment>
        }
        endAdornment={
          <InputAdornment position="end">
            <SendIcon
              color="primary"
              onClick={sendMessage}
              style={{ cursor: 'pointer' }}
            />
          </InputAdornment>
        }
        multiline
        rows={1}
      />
      {notifyOn && (
        <Alert
          severity={notifyType}
          style={{
            position: 'fixed',
            top: 50,
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          {notify}
        </Alert>
      )}
    </div>
  );
}

export default App;
