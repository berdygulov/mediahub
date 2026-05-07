import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M4 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H4zm0 2h2v2H4V5zm4 0h2v2H8V5zm4 0h2v2h-2V5zm4 0h2v2h-2V5zM4 9h16v10H4V9zm6.5 2.5a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .75.433l3.5-2a.5.5 0 0 0 0-.866l-3.5-2A.5.5 0 0 0 10.5 11.5z"
            />
        </svg>
    );
}
