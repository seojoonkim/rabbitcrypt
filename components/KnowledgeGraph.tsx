'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface RelationItem {
  slug: string;
  score: number;
}

interface PostMeta {
  slug: string;
  title: string;
}

interface KnowledgeGraphProps {
  currentSlug: string;
  relations: RelationItem[];
  posts: PostMeta[];
}

export default function KnowledgeGraph({ currentSlug, relations, posts }: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!svgRef.current || !relations.length) return;

    let d3: typeof import('d3') | null = null;

    async function render() {
      d3 = await import('d3');

      const svg = d3.select(svgRef.current!);
      svg.selectAll('*').remove();

      const container = svgRef.current!.parentElement!;
      const width = container.clientWidth || 600;
      const height = 300;

      svgRef.current!.setAttribute('width', String(width));
      svgRef.current!.setAttribute('height', String(height));
      svgRef.current!.setAttribute('viewBox', `0 0 ${width} ${height}`);

      // 노드 구성
      type NodeDatum = {
        id: string;
        title: string;
        isCurrent: boolean;
        score: number;
        x?: number;
        y?: number;
        fx?: number | null;
        fy?: number | null;
      };

      type LinkDatum = {
        source: string | NodeDatum;
        target: string | NodeDatum;
        score: number;
      };

      const currentPost = posts.find((p) => p.slug === currentSlug);
      const nodes: NodeDatum[] = [
        {
          id: currentSlug,
          title: currentPost?.title || currentSlug,
          isCurrent: true,
          score: 100,
        },
        ...relations.map((r) => {
          const p = posts.find((po) => po.slug === r.slug);
          return {
            id: r.slug,
            title: p?.title || r.slug,
            isCurrent: false,
            score: r.score,
          };
        }),
      ];

      const links: LinkDatum[] = relations.map((r) => ({
        source: currentSlug,
        target: r.slug,
        score: r.score,
      }));

      // force simulation
      const simulation = d3
        .forceSimulation(nodes as d3.SimulationNodeDatum[])
        .force(
          'link',
          d3
            .forceLink<d3.SimulationNodeDatum, d3.SimulationLinkDatum<d3.SimulationNodeDatum>>(
              links as d3.SimulationLinkDatum<d3.SimulationNodeDatum>[]
            )
            .id((d: d3.SimulationNodeDatum) => (d as NodeDatum).id)
            .distance((d) => 150 - ((d as LinkDatum).score || 50))
        )
        .force('charge', d3.forceManyBody().strength(-120))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(30));

      // 현재 노드를 중앙에 고정
      const centerNode = nodes.find((n) => n.isCurrent);
      if (centerNode) {
        centerNode.fx = width / 2;
        centerNode.fy = height / 2;
      }

      // defs: 마커 (화살표) - 필요 없으면 생략
      const defs = svg.append('defs');
      defs
        .append('filter')
        .attr('id', 'glow')
        .append('feGaussianBlur')
        .attr('stdDeviation', '3')
        .attr('result', 'coloredBlur');

      // 연결선
      const link = svg
        .append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke', '#D4922A')
        .attr('stroke-opacity', (d) => (d as LinkDatum).score / 120)
        .attr('stroke-width', (d) => ((d as LinkDatum).score > 80 ? 2 : 1));

      // 노드 그룹
      const node = svg
        .append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(nodes)
        .enter()
        .append('g')
        .style('cursor', 'pointer')
        .on('click', (_event: MouseEvent, d: unknown) => {
          const nd = d as NodeDatum;
          if (!nd.isCurrent) {
            router.push(`/posts/${nd.id}`);
          }
        })
        .on('mouseover', (event: MouseEvent, d: unknown) => {
          const nd = d as NodeDatum;
          if (tooltipRef.current) {
            tooltipRef.current.textContent = nd.title;
            tooltipRef.current.style.display = 'block';
            tooltipRef.current.style.left = `${event.offsetX + 12}px`;
            tooltipRef.current.style.top = `${event.offsetY - 28}px`;
          }
        })
        .on('mousemove', (event: MouseEvent) => {
          if (tooltipRef.current) {
            tooltipRef.current.style.left = `${event.offsetX + 12}px`;
            tooltipRef.current.style.top = `${event.offsetY - 28}px`;
          }
        })
        .on('mouseout', () => {
          if (tooltipRef.current) {
            tooltipRef.current.style.display = 'none';
          }
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .call((sel: any) => {
          d3!.drag<SVGGElement, NodeDatum>()
            .on('start', (event, d) => {
              if (!event.active) simulation.alphaTarget(0.3).restart();
              d.fx = d.x;
              d.fy = d.y;
            })
            .on('drag', (event, d) => {
              d.fx = event.x;
              d.fy = event.y;
            })
            .on('end', (event, d) => {
              if (!event.active) simulation.alphaTarget(0);
              if (!d.isCurrent) {
                d.fx = null;
                d.fy = null;
              }
            })(sel);
        });

      // 원 그리기
      node
        .append('circle')
        .attr('r', (d: unknown) => {
          const nd = d as NodeDatum;
          return nd.isCurrent ? 20 : Math.max(8, (nd.score / 10) * 4);
        })
        .attr('fill', (d: unknown) => {
          const nd = d as NodeDatum;
          if (nd.isCurrent) return '#D4922A';
          if (nd.score >= 90) return 'rgba(212,146,42,0.25)';
          if (nd.score >= 70) return 'rgba(138,122,94,0.2)';
          return 'rgba(90,74,62,0.2)';
        })
        .attr('stroke', (d: unknown) => {
          const nd = d as NodeDatum;
          if (nd.isCurrent) return '#F0A030';
          if (nd.score >= 90) return '#D4922A';
          if (nd.score >= 70) return '#8A7A5E';
          return '#5A4A3E';
        })
        .attr('stroke-width', (d: unknown) => {
          const nd = d as NodeDatum;
          return nd.isCurrent ? 2 : 1.5;
        });

      // 텍스트 라벨
      node
        .append('text')
        .attr('dy', (d: unknown) => {
          const nd = d as NodeDatum;
          return nd.isCurrent ? 34 : (Math.max(8, (nd.score / 10) * 4) + 14);
        })
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-family', "'Noto Sans KR', sans-serif")
        .attr('fill', 'rgba(240,228,204,0.65)')
        .attr('pointer-events', 'none')
        .text((d: unknown) => {
          const nd = d as NodeDatum;
          return nd.title.length > 10 ? nd.title.slice(0, 10) + '…' : nd.title;
        });

      // 점수 표시 (현재 노드 제외)
      node
        .filter((d: unknown) => !(d as NodeDatum).isCurrent)
        .append('text')
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('font-size', '8px')
        .attr('font-family', "'Noto Sans KR', sans-serif")
        .attr('fill', (d: unknown) => {
          const nd = d as NodeDatum;
          if (nd.score >= 90) return '#D4922A';
          if (nd.score >= 70) return '#8A7A5E';
          return '#5A4A3E';
        })
        .attr('pointer-events', 'none')
        .text((d: unknown) => `${(d as NodeDatum).score}%`);

      // tick 업데이트
      simulation.on('tick', () => {
        link
          .attr('x1', (d) => {
            const s = d.source as NodeDatum;
            return Math.max(20, Math.min(width - 20, s.x ?? width / 2));
          })
          .attr('y1', (d) => {
            const s = d.source as NodeDatum;
            return Math.max(20, Math.min(height - 20, s.y ?? height / 2));
          })
          .attr('x2', (d) => {
            const t = d.target as NodeDatum;
            return Math.max(20, Math.min(width - 20, t.x ?? width / 2));
          })
          .attr('y2', (d) => {
            const t = d.target as NodeDatum;
            return Math.max(20, Math.min(height - 20, t.y ?? height / 2));
          });

        node.attr('transform', (d: unknown) => {
          const nd = d as NodeDatum;
          const x = Math.max(20, Math.min(width - 20, nd.x ?? width / 2));
          const y = Math.max(20, Math.min(height - 20, nd.y ?? height / 2));
          return `translate(${x},${y})`;
        });
      });
    }

    render().catch(console.error);

    return () => {
      // cleanup
    };
  }, [currentSlug, relations, posts, router]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '300px', overflow: 'hidden' }}>
      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: '300px',
          display: 'block',
        }}
      />
      <div
        ref={tooltipRef}
        style={{
          display: 'none',
          position: 'absolute',
          background: 'rgba(13,24,38,0.95)',
          border: '1px solid rgba(212,146,42,0.3)',
          borderRadius: '6px',
          padding: '4px 10px',
          fontSize: '12px',
          color: '#F0E4CC',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 10,
          fontFamily: "'Noto Sans KR', sans-serif",
        }}
      />
    </div>
  );
}
