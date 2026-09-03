/** Editor flavour. Tier is chosen by rank; a specialisation mixes its own lines in. */
export const SNIPPETS: string[][] = [
  [
    '<span class="k">&lt;div</span> <span class="f">class</span>=<span class="s">"container"</span><span class="k">&gt;</span>',
    '<span class="k">const</span> name = <span class="s">"world"</span>;',
    '<span class="f">console</span>.<span class="f">log</span>(<span class="s">"hello, "</span> + name);',
    '<span class="k">if</span> (x <span class="k">&gt;</span> <span class="n">0</span>) { count<span class="k">++</span>; }',
    '<span class="c">// TODO: figure out why this works</span>',
    '<span class="k">function</span> <span class="f">add</span>(a, b) { <span class="k">return</span> a + b; }',
  ],
  [
    '<span class="k">for</span> (<span class="k">let</span> i = <span class="n">0</span>; i &lt; items.length; i<span class="k">++</span>) {',
    '<span class="k">const</span> [state, setState] = <span class="f">useState</span>(<span class="k">null</span>);',
    '<span class="k">await</span> <span class="f">fetch</span>(<span class="s">"/api/users"</span>).<span class="f">then</span>(r =&gt; r.<span class="f">json</span>());',
    '<span class="k">export default</span> <span class="k">function</span> <span class="f">App</span>() {',
    '<span class="c">/* fixed the off-by-one, again */</span>',
    '<span class="k">try</span> { <span class="f">save</span>(doc); } <span class="k">catch</span> (e) { <span class="f">report</span>(e); }',
  ],
  [
    '<span class="k">def</span> <span class="f">normalize</span>(rows: <span class="f">list</span>[<span class="f">Row</span>]) -&gt; <span class="f">Frame</span>:',
    '<span class="k">class</span> <span class="f">UserRepository</span>(<span class="f">Repository</span>[<span class="f">User</span>]):',
    '<span class="k">SELECT</span> id, <span class="f">count</span>(*) <span class="k">FROM</span> events <span class="k">GROUP BY</span> <span class="n">1</span>;',
    '<span class="k">assert</span> <span class="f">len</span>(result) <span class="k">==</span> <span class="n">42</span>, <span class="s">"unexpected fan-out"</span>',
    '<span class="c"># cache the expensive join, invalidate on write</span>',
    '@<span class="f">retry</span>(attempts=<span class="n">3</span>, backoff=<span class="n">1.5</span>)',
  ],
  [
    '<span class="k">func</span> (s *<span class="f">Server</span>) <span class="f">Handle</span>(ctx <span class="f">context</span>.<span class="f">Context</span>) <span class="k">error</span> {',
    '<span class="k">go</span> <span class="f">worker</span>(jobs, results) <span class="c">// fan out across cores</span>',
    '<span class="k">impl</span>&lt;T: <span class="f">Send</span>&gt; <span class="f">Scheduler</span>&lt;T&gt; {',
    '<span class="k">let</span> guard = lock.<span class="f">write</span>().<span class="f">await</span>;',
    '<span class="c">// p99 dropped from 800ms to 40ms</span>',
    'replicas: <span class="n">128</span>  <span class="c"># autoscale on queue depth</span>',
  ],
  [
    '<span class="c">// SPDX-License-Identifier: Apache-2.0</span>',
    '<span class="k">unsafe</span> { <span class="f">ptr</span>.<span class="f">write_volatile</span>(value) }',
    '<span class="k">theorem</span> <span class="f">safe</span> : <span class="k">∀</span> n, <span class="f">agreed</span> n → <span class="f">committed</span> n',
    '<span class="k">const</span> KERNEL = <span class="f">compile</span>(spec, <span class="f">Target</span>::<span class="f">Native</span>);',
    '<span class="c">/* shipped to 3.1 billion devices */</span>',
    '<span class="k">yield</span> <span class="f">proof</span>.<span class="f">verify</span>(theorem)  <span class="c"># QED</span>',
  ],
];
