'use client';
export default function ErrorPage({reset}){return <main style={{padding:'4rem',textAlign:'center'}}><h1>Something went wrong</h1><p>Please try again. No sensitive technical details have been exposed.</p><button onClick={()=>reset()}>Try again</button></main>}
