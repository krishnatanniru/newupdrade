
import React, { useState } from 'react';
import { useAppContext } from '../AppContext';

const Feedback: React.FC = () => {
  const { feedback, users, updateFeedbackStatus, currentUser, askGemini } = useAppContext();
  const [aiSummary, setAiSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  const filteredFeedback = currentUser?.role === 'SUPER_ADMIN' 
    ? feedback 
    : feedback.filter(f => f.branchId === currentUser?.branchId);

  const handleSummarize = async () => {
    if (filteredFeedback.length === 0) return;
    setIsSummarizing(true);
    const feedbackText = filteredFeedback
      .map(f => `Type: ${f.type}, Content: ${f.content}`)
      .join('\n');
    
    const prompt = `Act as a Professional Gym Operations Manager. Analyze the following member feedback and provide:
    1. A summary of the top 3 recurring issues.
    2. A sentiment score (0-100).
    3. An immediate 3-step Action Plan to improve member satisfaction.
    
    Feedback Data:
    ${feedbackText}`;

    const summary = await askGemini(prompt, 'flash');
    setAiSummary(summary);
    setIsSummarizing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">Intelligence & Voice</h2>
          <p className="text-gray-500">Listening to athletes and responding with AI-backed insights</p>
        </div>
        <button 
          onClick={handleSummarize}
          disabled={isSummarizing || filteredFeedback.length === 0}
          className="bg-slate-900 text-white px-6 py-2 rounded-xl font-black text-[10px] tracking-widest flex items-center gap-3 shadow-xl shadow-slate-200 disabled:opacity-50"
        >
          {isSummarizing ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-sparkles"></i>}
          GEMINI INSIGHTS
        </button>
      </div>

      {aiSummary && (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-100 p-8 rounded-[2.5rem] animate-[slideUp_0.4s_ease-out]">
           <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg">
                 <i className="fas fa-robot"></i>
              </div>
              <div>
                 <h3 className="text-sm font-black text-slate-900 uppercase">AI Branch Audit</h3>
                 <p className="text-[10px] text-indigo-500 font-bold">Generated from {filteredFeedback.length} member voices</p>
              </div>
              <button onClick={() => setAiSummary('')} className="ml-auto text-slate-400 hover:text-slate-600">
                 <i className="fas fa-times"></i>
              </button>
           </div>
           <div className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap max-h-96 overflow-y-auto">
              {aiSummary}
           </div>
        </div>
      )}

      <div className="space-y-4">
        {filteredFeedback.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-dashed text-center text-gray-400">
            No feedback entries found yet.
          </div>
        ) : (
          [...filteredFeedback].reverse().map(item => {
            const member = users.find(u => u.id === item.memberId);
            return (
              <div key={item.id} className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center hover:border-blue-200 transition-colors">
                <div className="flex items-center gap-3 min-w-[200px]">
                  <img src={member?.avatar} className="w-10 h-10 rounded-xl border object-cover" alt="" />
                  <div>
                    <p className="font-bold text-gray-900 leading-tight">{member?.name}</p>
                    <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest mt-0.5">{item.date}</p>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${item.type === 'COMPLAINT' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      {item.type}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">{item.content}</p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                  <select 
                    className={`text-[10px] font-black px-4 py-2 rounded-xl border outline-none transition-all uppercase tracking-widest ${
                      item.status === 'RESOLVED' ? 'bg-green-50 text-green-700 border-green-200' :
                      item.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                    value={item.status}
                    onChange={(e) => updateFeedbackStatus(item.id, e.target.value as any)}
                  >
                    <option value="NEW">New</option>
                    <option value="IN_PROGRESS">WIP</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Feedback;
