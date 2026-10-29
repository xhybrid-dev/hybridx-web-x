import {Composition} from 'remotion';
import './fonts';
import {RenderTest} from './compositions/RenderTest';
import {FPS} from './data/sceneTimings';
import {layout} from './tokens';

export const Root = () => (
	<>
		{/* Gate 0: one second, proves Chrome, fonts, tokens and encode work in this container. */}
		<Composition
			id="RenderTest"
			component={RenderTest}
			durationInFrames={FPS}
			fps={FPS}
			width={layout.landscape.width}
			height={layout.landscape.height}
		/>
	</>
);
