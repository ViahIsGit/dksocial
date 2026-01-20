import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import './FAQ.css';

const FAQ_DATA = [
    {
        question: "How do I reset my password?",
        answer: "Go to Settings > Account Center and tap on 'Change Password'. We will send a reset link to your registered email address."
    },
    {
        question: "Who can see my posts?",
        answer: "If your account is Private, only your followers can see your posts. If Public, anyone can see them. You can change this in Settings > Privacy."
    },
    {
        question: "How do I verify my account?",
        answer: "Verification is currently by invitation only for notable public figures and creators. Keep posting great content!"
    },
    {
        question: "Can I use DKSocial on multiple devices?",
        answer: "Yes! You can log in to your account on as many devices as you like. Your data syncs automatically."
    },
    {
        question: "How do I contact support?",
        answer: "You can email us directly at support@dksocial.app for any inquiries not covered here."
    }
];

export default function FAQ() {
    const navigate = useNavigate();
    const [openIndex, setOpenIndex] = useState(null);

    const toggleItem = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className="faq-page">
            <div className="back-button">
                <md-icon-button onClick={() => navigate(-1)}>
                    <md-icon>arrow_back</md-icon>
                </md-icon-button>
            </div>

            <div className="faq-header">
                <h1>Help Center</h1>
                <p>Frequently Asked Questions</p>
            </div>

            <div className="faq-container">
                {FAQ_DATA.map((item, index) => (
                    <div key={index} className={`faq-item ${openIndex === index ? 'open' : ''}`}>
                        <div className="faq-question" onClick={() => toggleItem(index)}>
                            {item.question}
                            <md-icon className="faq-icon">expand_more</md-icon>
                        </div>
                        {openIndex === index && (
                            <div className="faq-answer">
                                {item.answer}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
