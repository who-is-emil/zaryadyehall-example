export default {
  title: 'Styles/Typography',
  parameters: {
    docs: {
      description: {
        component: 'Пример использования типографики с различными стилями текста.',
      },
    },
  },
};

const Template = () => `
    <div style="padding: 16px;">
      <h1>Заголовок 1 (H1)</h1>
      <br>
      <br>
      <h2>Заголовок 2 (H2)</h2>
      <br>
      <br>
      <h3>Заголовок 3 (H3)</h3>
      <br>
      <br>
      <h4>Заголовок 4 (H4)</h4>
      <br>
      <br>
      <h5>Заголовок 5 (H5)</h5>
      <br>
      <br>
      <h6>Заголовок 6 (H6)</h6>
      <br>
      <br>
      <p class='text-body'>Text body</p>
      <br>
      <br>
      <p class='text-tag'>Text tag</p>
      <br>
      <br>
    
    </div>
  `;

export const Typography = Template.bind({});
Typography.storyName = 'Типографика';
