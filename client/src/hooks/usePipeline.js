import { useContext } from 'react';
import { PipelineContext } from '../context/PipelineContext'; 
import { runPipeline } from '../services/api';
export function usePipeline() {
     const ctx = useContext(PipelineContext); 
     if (!ctx) throw new Error('usePipeline must be inside PipelineProvider');
      const run = async data => { ctx.setLoading(true); ctx.setError(''); 
        try { ctx.setResult(await runPipeline(data)); 

        }
         catch (e) {
             ctx.setError(e.response?.data?.message || 'Could not contact the server.'); 
            }
             finally { ctx.setLoading(false); } };
             return { ...ctx, run };
             }
