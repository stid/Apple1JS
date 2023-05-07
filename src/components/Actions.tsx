export type ActionsProps = {
    onReset: React.MouseEventHandler<HTMLAnchorElement>;
    onBS: React.MouseEventHandler<HTMLAnchorElement>;
    supportBS: boolean;
};

const Actions = ({ onReset, onBS, supportBS }: ActionsProps) => (
    <div>
        <a onClick={onReset} href="#">
            RESET
        </a>{' '}
        |{' '}
        <a onClick={onBS} href="#">
            SUPOPRT BACKSPACE [{supportBS ? 'ON' : 'OFF'}]
        </a>
    </div>
);

export default Actions;
