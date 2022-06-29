import Chessboard from '../../deps/chessboardjsx/Chessboard';

export default function Game({ position, getPosition }) {
    return (
        <>
            <Chessboard position={position} sparePieces getPosition={getPosition} />
        </>
    );
}

