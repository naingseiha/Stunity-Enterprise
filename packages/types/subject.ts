export interface Subject {
  id: string;
  name: string;
  nameEn?: string;
  level: 'both' | 'អនុវិទ្យាល័យ' | 'វិទ្យាល័យ';
  maxScore: {
    [grade: string]: number;
  };
}