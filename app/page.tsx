'use client';
import { useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "👋 Hi! Welcome to ProfTalk - Your Professor Guide. How can I assist you today?"
    }
  ]);

  const [message, setMessage] = useState('');

  const sendMessage = async () => {
    const newMessages = [
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: '...' }, 
    ];
    setMessages(newMessages);
    setMessage('');

    try {
      const response = await fetch('/api/chat', {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newMessages)
      });

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let result = '';

      const processText = async ({ done, value }: { done: boolean, value?: Uint8Array }) => {
        if (done) {
          setMessages((prevMessages) => {
            let lastMessage = prevMessages[prevMessages.length - 1];
            lastMessage.content = result;
            return [...prevMessages];
          });
          return;
        }

        const text = decoder.decode(value || new Uint8Array(), { stream: true });
        result += text;

        setMessages((prevMessages) => {
          let lastMessage = prevMessages[prevMessages.length - 1];
          lastMessage.content = result;
          return [...prevMessages];
        });

        reader.read().then(processText);
      };

      reader.read().then(processText);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f7fa' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '26px', color: '#2c3e50', fontWeight: 'bold' }}>
          ProfTalk - Your Professor Guide
        </h1>

        <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: '10px', padding: '20px', overflowY: 'scroll', backgroundColor: '#fff', boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)' }}>
          {messages.map((msg, index) => (
            <div key={index} style={{ margin: '10px 0', display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', animation: 'fadeIn 0.5s' }}>
              <div style={{ maxWidth: '75%', padding: '10px 15px', borderRadius: '15px', backgroundColor: msg.role === 'user' ? '#007BFF' : '#f1f1f1', color: msg.role === 'user' ? 'white' : '#333', boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.1)' }}>
                <strong style={{ color: msg.role === 'user' ? 'white' : '#333' }}>{msg.role === 'user' ? 'You' : 'Assistant'}:</strong>
                <p style={{ margin: '5px 0 0' }}>{msg.content}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', marginTop: '10px' }}>
          <input 
            type="text" 
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            style={{ flex: 1, padding: '15px', borderRadius: '30px', border: '1px solid #ddd', fontSize: '16px', color: '#333', outline: 'none', boxShadow: 'inset 0px 1px 3px rgba(0, 0, 0, 0.1)' }} 
            placeholder="Type your message here..." 
          />
          <button 
            onClick={sendMessage} 
            style={{ padding: '10px 25px', marginLeft: '10px', borderRadius: '30px', backgroundColor: '#007BFF', color: 'white', border: 'none', fontSize: '16px', cursor: 'pointer', transition: 'background-color 0.3s' }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007BFF'}
          >
            Send
          </button>
        </div>
      </div>

      <div className="background-image" style={{ flex: 1 }} />
    </div>
  );
}
