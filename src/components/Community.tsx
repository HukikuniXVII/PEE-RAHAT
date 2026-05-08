import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowBigUp,
  MessageCircle, 
  Share2, 
  MoreHorizontal, 
  Globe, 
  Users, 
  Image as ImageIcon,
  Smile,
  Send,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  User
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { Post, Reply } from '../types';

const INITIAL_POSTS: Post[] = [
  {
    id: '1',
    authorId: 'u1',
    authorName: 'พี่นัท ปรึกษาเรียน',
    authorBadge: 'Eng CU | Alumni',
    title: 'เทคนิคเก็บคะแนน TGAT 1 ภายใน 1 เดือน',
    content: 'น้องๆ คนไหนที่กำลังเตรียมตัวสอบ TCAS รอบ 3 อย่าลืมเช็คเกณฑ์คะแนนวิชาเฉพาะของแต่ละมหาลัยดีๆ นะครับ ปีนี้มีการปรับเปลี่ยนสัดส่วนคะแนนบางวิชาด้วย ใครมีข้อสงสัยพิมพ์ถามทิ้งไว้ได้เลย!',
    upvotes: 124,
    replies: [
      { id: 'r1', authorId: 'u2', authorName: 'Dek68', content: 'พี่นัทครับ แล้วคณะวิศวะคอมใช้คะแนนสัดส่วนเท่าไหร่ครับ?', createdAt: '1h ago' }
    ],
    createdAt: '2 hours ago'
  },
  {
    id: '2',
    authorId: 'u3',
    authorName: 'Jane_Arts',
    authorBadge: 'Arts CU | Tutor',
    title: 'แจกสรุป Vocab หมวดการเมือง ออกสอบบ่อย!',
    content: 'สรุปวิชาภาษาอังกฤษเรื่อง Vocab ทำเสร็จแล้วนะจ๊ะ ใครอยากได้บ้าง? พิมพ์ "สนใจ" ไว้เดี๋ยวพี่ส่งวาร์ปให้จ้าาา ⚡️⚡️',
    upvotes: 856,
    replies: [],
    createdAt: '5 hours ago'
  },
];

export default function Community() {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<string[]>([]);

  const handleUpvote = (id: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === id) {
        return { ...post, upvotes: post.upvotes + 1 };
      }
      return post;
    }));
  };

  const toggleReplies = (id: string) => {
    setExpandedReplies(prev => 
      prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
    );
  };

  const handleCreatePost = () => {
    if (!newPostContent.trim() || !newPostTitle.trim()) return;
    const newPost: Post = {
      id: Date.now().toString(),
      authorId: 'current-user',
      authorName: 'You',
      authorBadge: 'Student',
      title: newPostTitle,
      content: newPostContent,
      upvotes: 0,
      replies: [],
      createdAt: 'Just now'
    };
    setPosts([newPost, ...posts]);
    setNewPostContent('');
    setNewPostTitle('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="space-y-2">
        <h2 className="text-4xl font-black text-slate-900">Webboard Community</h2>
        <p className="text-slate-500 font-medium tracking-tight">พื้นที่แลกเปลี่ยนเทคนิคการเรียนสำหรับเด็ก TCAS โดยเฉพาะ</p>
      </div>

      {/* Create Post */}
      <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm space-y-6">
        <div className="flex gap-4">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
             <User size={24} />
          </div>
          <div className="flex-1 space-y-4">
            <input 
              type="text"
              value={newPostTitle}
              onChange={(e) => setNewPostTitle(e.target.value)}
              placeholder="หัวข้อกระทู้ของคุณ..."
              className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
            />
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="เนื้อหาที่ต้องการแชร์..."
              className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 resize-none min-h-[120px]"
            />
            <div className="flex items-center justify-between pt-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                กรุณาตรวจสอบให้แน่ใจว่าไม่มีข้อมูลส่วนตัว (PDPA)
              </p>
              <button 
                onClick={handleCreatePost}
                disabled={!newPostContent.trim() || !newPostTitle.trim()}
                className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
              >
                ตั้งกระทู้
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-6">
        {posts.map((post) => (
          <motion.div 
            layout
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="flex">
              {/* Vote Sidebar */}
              <div className="w-16 bg-slate-50 border-r border-slate-100 flex flex-col items-center py-6 gap-2">
                 <button 
                   onClick={() => handleUpvote(post.id)}
                   className="p-1 hover:bg-indigo-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                 >
                   <ArrowBigUp size={32} />
                 </button>
                 <span className="font-black text-slate-700">{post.upvotes}</span>
              </div>

              <div className="flex-1 p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                         {post.authorBadge}
                       </span>
                       <span className="text-[10px] text-slate-300 font-bold">•</span>
                       <span className="text-[10px] text-slate-400 font-medium">{post.createdAt}</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                      {post.title}
                    </h3>
                  </div>
                  <button className="p-2 text-slate-300 hover:text-red-400 transition-colors flex items-center gap-1 text-[10px] font-bold">
                    <AlertTriangle size={14} />
                    Report
                  </button>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">
                  {post.content}
                </p>

                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                  <button 
                    onClick={() => toggleReplies(post.id)}
                    className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                  >
                    <MessageCircle size={18} />
                    {post.replies.length} ความคิดเห็น
                    <ChevronDown size={14} className={cn("transition-transform", expandedReplies.includes(post.id) && "rotate-180")} />
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                       <p className="text-[10px] font-black text-slate-900">{post.authorName}</p>
                       <p className="text-[9px] text-slate-400 uppercase tracking-tighter">Post Author</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                       <User size={16} />
                    </div>
                  </div>
                </div>

                {/* Threaded Replies */}
                <AnimatePresence>
                  {expandedReplies.includes(post.id) && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 pt-6 border-t border-slate-100 overflow-hidden"
                    >
                      {post.replies.map(reply => (
                        <div key={reply.id} className="flex gap-3 pl-4 border-l-2 border-slate-100 py-1">
                          <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300">
                            <User size={12} />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-900">{reply.authorName}</span>
                              <span className="text-[9px] text-slate-400">{reply.createdAt}</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-normal">{reply.content}</p>
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-3 pt-2">
                        <textarea 
                          placeholder="ตอบกลับ..."
                          className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-indigo-500/20"
                        />
                        <button className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">
                           <Send size={14} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* DBD Footer Placeholder */}
      <div className="text-center pt-12 space-y-4 opacity-30 grayscale saturate-0">
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Registered with DBD E-Commerce Thailand</p>
          <div className="flex justify-center gap-8">
             <div className="w-12 h-6 bg-slate-300 rounded" />
             <div className="w-12 h-6 bg-slate-300 rounded" />
          </div>
      </div>
    </div>
  );
}
